import QRCode from "qrcode";

import { str, ToolError, num, type OpResult, type PureOp } from "../types";

/**
 * QR generation. The payload formats below are the de-facto standards phone
 * cameras understand — there is no formal spec for the Wi-Fi one, but every
 * scanner follows the same shape.
 */

/** Wi-Fi payloads use \ to escape ; , : and \ itself, or the fields run together. */
function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildQrPayload(options: Record<string, unknown>): string {
  const get = (id: string) => String(options[id] ?? "").trim();
  const kind = String(options.kind ?? "text");

  switch (kind) {
    case "wifi": {
      const ssid = get("ssid");
      if (!ssid) throw new ToolError("Enter the network name.");
      const security = get("wifiSecurity") || "WPA";
      const password = get("wifiPassword");
      const auth = security === "nopass" ? "nopass" : security;
      return `WIFI:T:${auth};S:${escapeWifi(ssid)};${auth === "nopass" ? "" : `P:${escapeWifi(password)};`};`;
    }
    case "vcard": {
      const name = get("name");
      if (!name) throw new ToolError("Enter a name for the contact card.");
      const [first = "", ...rest] = name.split(" ");
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${rest.join(" ")};${first}`,
        `FN:${name}`,
        get("org") ? `ORG:${get("org")}` : "",
        get("phone") ? `TEL;TYPE=CELL:${get("phone")}` : "",
        get("email") ? `EMAIL:${get("email")}` : "",
        "END:VCARD",
      ];
      return lines.filter(Boolean).join("\n");
    }
    case "sms": {
      const number = get("smsNumber");
      if (!number) throw new ToolError("Enter a number to message.");
      return `SMSTO:${number}:${get("smsBody")}`;
    }
    case "email": {
      const to = get("emailTo");
      if (!to) throw new ToolError("Enter an email address.");
      const subject = get("emailSubject");
      return subject ? `mailto:${to}?subject=${encodeURIComponent(subject)}` : `mailto:${to}`;
    }
    default: {
      const content = get("content");
      if (!content) throw new ToolError("Enter the link or text to encode.");
      return content;
    }
  }
}

export const qrGenerate: PureOp = async (_input, options): Promise<OpResult> => {
  const payload = buildQrPayload(options);
  const size = Math.min(2048, Math.max(128, num(options, "size", 512)));

  const svg = await QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: (str(options, "ecc", "M") || "M") as "L" | "M" | "Q" | "H",
    margin: num(options, "margin", 2),
    width: size,
    color: {
      dark: str(options, "dark", "#0f172a"),
      light: str(options, "light", "#ffffff"),
    },
  });

  return {
    output: svg,
    format: "code",
    extra: { svg, payload, size },
    stats: [
      { label: "Payload", value: `${payload.length} characters` },
      { label: "Correction", value: str(options, "ecc", "M") },
    ],
    note:
      str(options, "kind", "text") === "wifi"
        ? "Anyone who scans this code joins the network — the password is inside the code itself, not hidden by it."
        : undefined,
  };
};
