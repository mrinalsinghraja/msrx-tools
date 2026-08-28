import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Network and client tools: CIDR planning, DNS output parsing, user-agent
 * dissection.
 *
 * None of these touch the network. The CIDR planner does arithmetic, the DNS
 * parser reads output you already ran, and the user-agent parser reads a string
 * you already have. A tool that resolved a name for you would need a server,
 * and would leak the name you looked up.
 */

/* ------------------------------------------------------------------ */
/* CIDR                                                                 */
/* ------------------------------------------------------------------ */

function parseIpv4(text: string): number {
  const parts = text.split(".");
  if (parts.length !== 4) throw new ToolError(`“${text}” is not an IPv4 address — it needs four parts.`);
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) throw new ToolError(`“${part}” is not a number between 0 and 255.`);
    const octet = Number(part);
    if (octet > 255) throw new ToolError(`“${part}” is above 255, so it cannot be part of an address.`);
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function formatIpv4(value: number): string {
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}

function ipv4Binary(value: number): string {
  return [24, 16, 8, 0].map((shift) => ((value >>> shift) & 255).toString(2).padStart(8, "0")).join(".");
}

/** RFC 1918, loopback, link-local and CGNAT — the ranges that never route publicly. */
function ipv4Scope(value: number): string {
  const a = (value >>> 24) & 255;
  const b = (value >>> 16) & 255;
  if (a === 10) return "Private (RFC 1918)";
  if (a === 172 && b >= 16 && b <= 31) return "Private (RFC 1918)";
  if (a === 192 && b === 168) return "Private (RFC 1918)";
  if (a === 127) return "Loopback";
  if (a === 169 && b === 254) return "Link-local";
  if (a === 100 && b >= 64 && b <= 127) return "Carrier-grade NAT (RFC 6598)";
  if (a >= 224 && a <= 239) return "Multicast";
  if (a === 0) return "This network";
  if (a >= 240) return "Reserved";
  return "Public";
}

function expandIpv6(text: string): bigint {
  const [head, tail] = text.split("::");
  const left = head ? head.split(":").filter(Boolean) : [];
  const right = tail ? tail.split(":").filter(Boolean) : [];
  if (text.includes("::")) {
    const missing = 8 - left.length - right.length;
    if (missing < 0) throw new ToolError(`“${text}” has too many groups to be an IPv6 address.`);
    left.push(...Array(missing).fill("0"), ...right);
  }
  const groups = text.includes("::") ? left : text.split(":");
  if (groups.length !== 8) throw new ToolError(`“${text}” is not an IPv6 address — it needs eight groups.`);

  let value = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(group)) throw new ToolError(`“${group}” is not a hexadecimal group.`);
    value = (value << 16n) | BigInt(parseInt(group, 16));
  }
  return value;
}

function formatIpv6(value: bigint): string {
  const groups: string[] = [];
  for (let i = 7; i >= 0; i--) {
    groups.push(((value >> BigInt(i * 16)) & 0xffffn).toString(16));
  }
  // Collapse the longest run of zero groups, as RFC 5952 requires.
  let bestStart = -1;
  let bestLength = 0;
  let start = -1;
  for (let i = 0; i <= groups.length; i++) {
    if (i < groups.length && groups[i] === "0") {
      if (start === -1) start = i;
    } else if (start !== -1) {
      if (i - start > bestLength) {
        bestLength = i - start;
        bestStart = start;
      }
      start = -1;
    }
  }
  if (bestLength > 1) {
    return `${groups.slice(0, bestStart).join(":")}::${groups.slice(bestStart + bestLength).join(":")}`;
  }
  return groups.join(":");
}

function pad(label: string, width: number): string {
  return label.padEnd(width);
}

export const cidrCalculate: PureOp = (input, options): OpResult => {
  const text = input.trim().split(/\s+/)[0] ?? "";
  if (!text) return { output: "" };

  const showBinary = bool(options, "binary", false);
  const newPrefix = num(options, "splitPrefix", 0);
  const maxRows = Math.max(1, Math.min(256, num(options, "maxSubnets", 16)));

  const [address, prefixText] = text.split("/");

  if (address.includes(":")) {
    const value = expandIpv6(address);
    const prefix = prefixText === undefined ? 128 : Number(prefixText);
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 128) {
      throw new ToolError(`An IPv6 prefix runs from /0 to /128, so “/${prefixText}” cannot be read.`);
    }
    const hostBits = BigInt(128 - prefix);
    const mask = ((1n << BigInt(prefix)) - 1n) << hostBits;
    const network = value & mask;
    const last = network | ((1n << hostBits) - 1n);
    const total = 1n << hostBits;

    const lines = [
      `${pad("Network", 16)}${formatIpv6(network)}/${prefix}`,
      `${pad("First address", 16)}${formatIpv6(network)}`,
      `${pad("Last address", 16)}${formatIpv6(last)}`,
      `${pad("Addresses", 16)}${total.toLocaleString()}`,
      `${pad("Prefix", 16)}/${prefix}`,
    ];

    return {
      output: lines.join("\n"),
      format: "code",
      stats: [
        { label: "Version", value: "IPv6" },
        { label: "Prefix", value: `/${prefix}` },
        { label: "Addresses", value: total > 10n ** 12n ? "astronomical" : total.toLocaleString() },
      ],
      note:
        newPrefix > 0 || showBinary
          ? "Subnet splitting and binary layout apply to IPv4 only — an IPv6 /64 holds more addresses than there are grains of sand, so listing them helps nobody."
          : "IPv6 subnets are conventionally /64 for a LAN and /48 or /56 for a site. Smaller than /64 breaks stateless autoconfiguration.",
    };
  }

  const value = parseIpv4(address);
  const prefix = prefixText === undefined ? 32 : Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new ToolError(`An IPv4 prefix runs from /0 to /32, so “/${prefixText}” cannot be read.`);
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = ~mask >>> 0;
  const network = (value & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 is a point-to-point link (RFC 3021) and /32 is a single host: neither
  // spends addresses on a network and broadcast the way larger blocks do.
  const usable = prefix >= 31 ? total : Math.max(0, total - 2);
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;

  const lines = [
    `${pad("Network", 18)}${formatIpv4(network)}/${prefix}`,
    `${pad("Netmask", 18)}${formatIpv4(mask)}`,
    `${pad("Wildcard", 18)}${formatIpv4(wildcard)}`,
    `${pad("Broadcast", 18)}${prefix >= 31 ? "—" : formatIpv4(broadcast)}`,
    `${pad("First host", 18)}${formatIpv4(firstHost)}`,
    `${pad("Last host", 18)}${formatIpv4(lastHost)}`,
    `${pad("Total addresses", 18)}${total.toLocaleString()}`,
    `${pad("Usable hosts", 18)}${usable.toLocaleString()}`,
    `${pad("Scope", 18)}${ipv4Scope(network)}`,
  ];

  if (showBinary) {
    lines.push(
      "",
      "Binary",
      `${pad("  Address", 18)}${ipv4Binary(value)}`,
      `${pad("  Netmask", 18)}${ipv4Binary(mask)}`,
      `${pad("  Network", 18)}${ipv4Binary(network)}`,
      `${pad("  Host bits", 18)}${"n".repeat(prefix).padEnd(32, "h").replace(/(.{8})(?=.)/g, "$1.")}`,
    );
  }

  let subnetCount = 0;
  if (newPrefix > 0) {
    if (newPrefix < prefix) {
      throw new ToolError(
        `A /${newPrefix} is larger than the /${prefix} you started with. Pick a number above ${prefix} to divide the block.`,
      );
    }
    if (newPrefix > 32) throw new ToolError("An IPv4 prefix cannot go past /32.");

    const step = 2 ** (32 - newPrefix);
    subnetCount = total / step;
    const shown = Math.min(subnetCount, maxRows);

    lines.push("", `Split into /${newPrefix} — ${subnetCount.toLocaleString()} subnets`);
    for (let i = 0; i < shown; i++) {
      const start = (network + i * step) >>> 0;
      const end = (start + step - 1) >>> 0;
      const hosts = newPrefix >= 31 ? step : step - 2;
      lines.push(
        `  ${pad(`${formatIpv4(start)}/${newPrefix}`, 20)}${formatIpv4(start)} – ${formatIpv4(end)}   ${hosts.toLocaleString()} hosts`,
      );
    }
    if (subnetCount > shown) {
      lines.push(`  … ${(subnetCount - shown).toLocaleString()} more. Raise the row limit to see them.`);
    }
  }

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Usable hosts", value: usable.toLocaleString() },
      { label: "Netmask", value: formatIpv4(mask) },
      { label: "Scope", value: ipv4Scope(network) },
    ],
    note:
      prefix === 31
        ? "A /31 has no network or broadcast address — both addresses are usable on a point-to-point link (RFC 3021)."
        : undefined,
  };
};

/* ------------------------------------------------------------------ */
/* DNS output parsing                                                   */
/* ------------------------------------------------------------------ */

interface DnsRecord {
  name: string;
  ttl: string;
  type: string;
  value: string;
}

const RECORD_TYPES = new Set([
  "A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "SRV", "PTR", "CAA", "DS",
  "DNSKEY", "NAPTR", "SPF", "TLSA", "SVCB", "HTTPS",
]);

/**
 * Reads `dig`, `dig +short`, `host` and `nslookup` output.
 *
 * The formats differ enough that sniffing is unavoidable: dig is tab-separated
 * with the type in the fourth field, host writes prose ("has address"), and
 * nslookup uses `key = value` pairs. Lines that match none of them are skipped
 * rather than guessed at.
 */
function parseDnsLines(text: string): DnsRecord[] {
  const records: DnsRecord[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    // dig: name TTL class type value
    const digMatch = /^(\S+)\s+(\d+)\s+(IN|CH|HS)\s+([A-Z0-9]+)\s+(.+)$/.exec(line);
    if (digMatch && RECORD_TYPES.has(digMatch[4])) {
      records.push({ name: digMatch[1], ttl: digMatch[2], type: digMatch[4], value: digMatch[5].trim() });
      continue;
    }

    // host: name has address 1.2.3.4 / name mail is handled by 10 mx.example.com
    const hostMatch =
      /^(\S+)\s+(?:has address|has IPv6 address|is an alias for|mail is handled by|domain name pointer|descriptive text)\s+(.+)$/i.exec(
        line,
      );
    if (hostMatch) {
      const kind = /IPv6/i.test(line)
        ? "AAAA"
        : /alias/i.test(line)
          ? "CNAME"
          : /mail is handled/i.test(line)
            ? "MX"
            : /pointer/i.test(line)
              ? "PTR"
              : /descriptive text/i.test(line)
                ? "TXT"
                : "A";
      records.push({ name: hostMatch[1], ttl: "—", type: kind, value: hostMatch[2].trim() });
      continue;
    }

    // nslookup: "Address: 1.2.3.4", "name = ns1.example.com."
    const nsMatch = /^(?:Address|Name|name|text|internet address)\s*[:=]\s*(.+)$/.exec(line);
    if (nsMatch && !/^Server/.test(line)) {
      const candidate = nsMatch[1].trim();
      const type = candidate.includes(":") ? "AAAA" : /^[\d.]+$/.test(candidate) ? "A" : "CNAME";
      records.push({ name: "—", ttl: "—", type, value: candidate });
      continue;
    }

    // dig +short: bare values, no name column.
    if (/^[\d.]+$/.test(line)) {
      records.push({ name: "—", ttl: "—", type: "A", value: line });
      continue;
    }
    if (/^[0-9a-f:]+$/i.test(line) && line.includes(":")) {
      records.push({ name: "—", ttl: "—", type: "AAAA", value: line });
      continue;
    }
    if (/^\d+\s+\S+\.$/.test(line)) {
      records.push({ name: "—", ttl: "—", type: "MX", value: line });
      continue;
    }
    if (/^".*"$/.test(line)) {
      records.push({ name: "—", ttl: "—", type: "TXT", value: line });
    }
  }

  return records;
}

/** Reads the SPF, DMARC and DKIM meaning out of a TXT record, when it has one. */
function describeTxt(value: string): string | undefined {
  const text = value.replace(/^"|"$/g, "");
  if (/^v=spf1/i.test(text)) {
    const all = /([-~?+])all\b/.exec(text);
    const policy =
      all?.[1] === "-" ? "hard fail" : all?.[1] === "~" ? "soft fail" : all?.[1] === "?" ? "neutral" : "pass anything";
    return `SPF — senders not listed: ${policy}`;
  }
  if (/^v=DMARC1/i.test(text)) {
    const policy = /p=(\w+)/i.exec(text)?.[1] ?? "none";
    return `DMARC — policy ${policy}`;
  }
  if (/^v=DKIM1/i.test(text)) return "DKIM public key";
  if (/^google-site-verification=/i.test(text)) return "Google site verification";
  if (/^MS=/i.test(text)) return "Microsoft domain verification";
  return undefined;
}

export const dnsParse: PureOp = (input, options): OpResult => {
  const text = input.trim();
  if (!text) return { output: "" };

  const format = str(options, "format", "table");
  const groupByType = bool(options, "group", true);
  const explain = bool(options, "explain", true);

  const records = parseDnsLines(text);
  if (records.length === 0) {
    throw new ToolError(
      "No DNS records found in that. Paste the output of `dig example.com ANY`, `host example.com` or `nslookup example.com`.",
    );
  }

  const ordered = groupByType
    ? [...records].sort((a, b) => a.type.localeCompare(b.type) || a.value.localeCompare(b.value))
    : records;

  if (format === "json") {
    const payload = ordered.map((record) => ({
      name: record.name === "—" ? null : record.name,
      ttl: record.ttl === "—" ? null : Number(record.ttl),
      type: record.type,
      value: record.value,
      ...(explain && record.type === "TXT" ? { meaning: describeTxt(record.value) ?? null } : {}),
    }));
    return {
      output: JSON.stringify(payload, null, 2),
      format: "json",
      stats: [{ label: "Records", value: String(records.length) }],
    };
  }

  if (format === "csv") {
    const rows = ["name,ttl,type,value", ...ordered.map((r) => [r.name, r.ttl, r.type, `"${r.value.replace(/"/g, '""')}"`].join(","))];
    return { output: rows.join("\n"), format: "csv", stats: [{ label: "Records", value: String(records.length) }] };
  }

  const widths = {
    name: Math.max(4, ...ordered.map((r) => r.name.length)),
    ttl: Math.max(3, ...ordered.map((r) => r.ttl.length)),
    type: Math.max(4, ...ordered.map((r) => r.type.length)),
  };

  const lines = [
    `${pad("NAME", widths.name)}  ${pad("TTL", widths.ttl)}  ${pad("TYPE", widths.type)}  VALUE`,
    `${"-".repeat(widths.name)}  ${"-".repeat(widths.ttl)}  ${"-".repeat(widths.type)}  ${"-".repeat(20)}`,
  ];

  for (const record of ordered) {
    lines.push(`${pad(record.name, widths.name)}  ${pad(record.ttl, widths.ttl)}  ${pad(record.type, widths.type)}  ${record.value}`);
    if (explain) {
      const meaning = record.type === "TXT" ? describeTxt(record.value) : undefined;
      if (meaning) lines.push(`${" ".repeat(widths.name + widths.ttl + widths.type + 6)}↳ ${meaning}`);
    }
  }

  const byType = new Map<string, number>();
  for (const record of records) byType.set(record.type, (byType.get(record.type) ?? 0) + 1);

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Records", value: String(records.length) },
      { label: "Types", value: [...byType.keys()].sort().join(", ") },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* User agent                                                           */
/* ------------------------------------------------------------------ */

interface UaFacts {
  browser: string;
  browserVersion: string;
  engine: string;
  engineVersion: string;
  os: string;
  osVersion: string;
  device: string;
  bot: string | null;
}

const BOTS: [RegExp, string][] = [
  [/googlebot/i, "Googlebot"],
  [/bingbot/i, "Bingbot"],
  [/duckduckbot/i, "DuckDuckBot"],
  [/baiduspider/i, "Baidu Spider"],
  [/yandexbot/i, "YandexBot"],
  [/slurp/i, "Yahoo Slurp"],
  [/gptbot/i, "OpenAI GPTBot"],
  [/oai-searchbot/i, "OpenAI SearchBot"],
  [/chatgpt-user/i, "ChatGPT browsing"],
  [/claudebot|claude-web/i, "Anthropic ClaudeBot"],
  [/perplexitybot/i, "PerplexityBot"],
  [/applebot/i, "Applebot"],
  [/ahrefsbot/i, "AhrefsBot"],
  [/semrushbot/i, "SemrushBot"],
  [/facebookexternalhit/i, "Facebook link preview"],
  [/twitterbot/i, "Twitterbot"],
  [/linkedinbot/i, "LinkedInBot"],
  [/whatsapp/i, "WhatsApp link preview"],
  [/curl|wget|python-requests|axios|go-http-client|okhttp/i, "Command-line or library client"],
  [/bot\b|crawler|spider/i, "Unidentified crawler"],
];

function versionAfter(ua: string, pattern: RegExp): string {
  return pattern.exec(ua)?.[1] ?? "";
}

function readUserAgent(ua: string): UaFacts {
  const facts: UaFacts = {
    browser: "Unknown",
    browserVersion: "",
    engine: "Unknown",
    engineVersion: "",
    os: "Unknown",
    osVersion: "",
    device: "Desktop",
    bot: null,
  };

  for (const [pattern, name] of BOTS) {
    if (pattern.test(ua)) {
      facts.bot = name;
      break;
    }
  }

  // Order matters: every Chromium browser also claims to be Chrome and Safari,
  // and Chrome claims to be Safari. The most specific token has to win.
  if (/edg[ea]?\//i.test(ua)) {
    facts.browser = "Edge";
    facts.browserVersion = versionAfter(ua, /edg[ea]?\/([\d.]+)/i);
  } else if (/opr\/|opera/i.test(ua)) {
    facts.browser = "Opera";
    facts.browserVersion = versionAfter(ua, /(?:opr|opera)[/ ]([\d.]+)/i);
  } else if (/samsungbrowser/i.test(ua)) {
    facts.browser = "Samsung Internet";
    facts.browserVersion = versionAfter(ua, /samsungbrowser\/([\d.]+)/i);
  } else if (/ucbrowser/i.test(ua)) {
    facts.browser = "UC Browser";
    facts.browserVersion = versionAfter(ua, /ucbrowser\/([\d.]+)/i);
  } else if (/firefox\/|fxios/i.test(ua)) {
    facts.browser = "Firefox";
    facts.browserVersion = versionAfter(ua, /(?:firefox|fxios)\/([\d.]+)/i);
  } else if (/crios\//i.test(ua)) {
    facts.browser = "Chrome on iOS";
    facts.browserVersion = versionAfter(ua, /crios\/([\d.]+)/i);
  } else if (/chrome\/|chromium/i.test(ua)) {
    facts.browser = "Chrome";
    facts.browserVersion = versionAfter(ua, /(?:chrome|chromium)\/([\d.]+)/i);
  } else if (/safari\//i.test(ua) && /version\//i.test(ua)) {
    facts.browser = "Safari";
    facts.browserVersion = versionAfter(ua, /version\/([\d.]+)/i);
  } else if (/msie |trident/i.test(ua)) {
    facts.browser = "Internet Explorer";
    facts.browserVersion = versionAfter(ua, /(?:msie |rv:)([\d.]+)/i);
  }

  if (/edg[ea]?\//i.test(ua) || /chrome\/|crios|chromium/i.test(ua)) {
    facts.engine = "Blink";
    facts.engineVersion = versionAfter(ua, /(?:chrome|chromium|crios)\/([\d.]+)/i);
  } else if (/gecko\/|firefox/i.test(ua) && !/like gecko/i.test(ua)) {
    facts.engine = "Gecko";
    facts.engineVersion = versionAfter(ua, /rv:([\d.]+)/i);
  } else if (/applewebkit/i.test(ua)) {
    facts.engine = "WebKit";
    facts.engineVersion = versionAfter(ua, /applewebkit\/([\d.]+)/i);
  } else if (/trident/i.test(ua)) {
    facts.engine = "Trident";
    facts.engineVersion = versionAfter(ua, /trident\/([\d.]+)/i);
  }

  if (/windows nt/i.test(ua)) {
    facts.os = "Windows";
    const nt = versionAfter(ua, /windows nt ([\d.]+)/i);
    const names: Record<string, string> = {
      "10.0": "10 or 11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
    };
    facts.osVersion = names[nt] ?? nt;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    facts.os = "iOS";
    facts.osVersion = versionAfter(ua, /os ([\d_]+)/i).replace(/_/g, ".");
    facts.device = /ipad/i.test(ua) ? "Tablet" : "Phone";
  } else if (/android/i.test(ua)) {
    facts.os = "Android";
    facts.osVersion = versionAfter(ua, /android ([\d.]+)/i);
    facts.device = /mobile/i.test(ua) ? "Phone" : "Tablet";
  } else if (/mac os x/i.test(ua)) {
    facts.os = "macOS";
    facts.osVersion = versionAfter(ua, /mac os x ([\d_.]+)/i).replace(/_/g, ".");
  } else if (/cros/i.test(ua)) {
    facts.os = "ChromeOS";
  } else if (/linux/i.test(ua)) {
    facts.os = "Linux";
  }

  if (/smart-?tv|appletv|googletv|hbbtv/i.test(ua)) facts.device = "TV";
  else if (/mobile|iphone|ipod/i.test(ua)) facts.device = "Phone";
  else if (/ipad|tablet/i.test(ua)) facts.device = "Tablet";
  if (facts.bot) facts.device = "Bot";

  return facts;
}

export const userAgentParse: PureOp = (input, options): OpResult => {
  const ua = input.trim().replace(/^user-agent:\s*/i, "");
  if (!ua) return { output: "" };

  const format = str(options, "format", "report");
  const advice = bool(options, "advice", true);
  const facts = readUserAgent(ua);

  const rows: [string, string][] = [
    ["Browser", `${facts.browser}${facts.browserVersion ? ` ${facts.browserVersion}` : ""}`],
    ["Engine", `${facts.engine}${facts.engineVersion ? ` ${facts.engineVersion}` : ""}`],
    ["Operating system", `${facts.os}${facts.osVersion ? ` ${facts.osVersion}` : ""}`],
    ["Device", facts.device],
  ];
  if (facts.bot) rows.push(["Automated client", facts.bot]);

  if (format === "json") {
    return {
      output: JSON.stringify({ ...facts, raw: ua }, null, 2),
      format: "json",
      stats: [
        { label: "Browser", value: facts.browser },
        { label: "OS", value: facts.os },
        { label: "Device", value: facts.device },
      ],
      note: advice
        ? "User-agent strings are self-reported and increasingly frozen. Feature-detect, or read the Sec-CH-UA client hints, before branching on any of this."
        : undefined,
    };
  }

  const width = Math.max(...rows.map(([label]) => label.length));
  const lines = rows.map(([label, value]) => `${pad(label, width)}  ${value}`);

  if (advice) {
    lines.push("", "Worth knowing");
    lines.push("  • Every part of this string is chosen by the client. None of it is verified.");
    lines.push("  • Chrome has frozen most of its version detail; Safari reports a fixed WebKit build.");
    if (facts.bot) lines.push(`  • This claims to be ${facts.bot}. Verify by reverse DNS before trusting it.`);
    else lines.push("  • Prefer feature detection, or Sec-CH-UA client hints, over parsing this.");
  }

  return {
    output: lines.join("\n"),
    format: "code",
    stats: [
      { label: "Browser", value: facts.browser },
      { label: "OS", value: facts.os },
      { label: "Device", value: facts.device },
    ],
  };
};
