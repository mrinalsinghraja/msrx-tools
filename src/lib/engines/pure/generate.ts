import { bool, num, str, ToolError, type OpResult, type PureOp } from "../types";

/**
 * Generators that build a file from choices rather than from input: .gitignore
 * blueprints and mock datasets.
 */

/* ------------------------------------------------------------------ */
/* .gitignore                                                           */
/* ------------------------------------------------------------------ */

interface IgnoreSection {
  id: string;
  title: string;
  lines: string[];
}

const IGNORE_SECTIONS: IgnoreSection[] = [
  {
    id: "node",
    title: "Node",
    lines: [
      "node_modules/",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "pnpm-debug.log*",
      ".pnpm-store/",
      "*.tsbuildinfo",
      ".eslintcache",
      "coverage/",
      "dist/",
      "build/",
    ],
  },
  {
    id: "next",
    title: "Next.js",
    lines: [".next/", "out/", ".vercel/", "next-env.d.ts"],
  },
  {
    id: "python",
    title: "Python",
    lines: [
      "__pycache__/",
      "*.py[cod]",
      "*.egg-info/",
      ".eggs/",
      ".venv/",
      "venv/",
      "env/",
      ".pytest_cache/",
      ".mypy_cache/",
      ".ruff_cache/",
      ".tox/",
      "htmlcov/",
      ".coverage",
    ],
  },
  {
    id: "go",
    title: "Go",
    lines: ["*.exe", "*.test", "*.out", "vendor/", "bin/", "go.work.sum"],
  },
  {
    id: "rust",
    title: "Rust",
    lines: ["target/", "**/*.rs.bk", "Cargo.lock  # keep this for binaries, ignore it for libraries"],
  },
  {
    id: "java",
    title: "Java, Kotlin and Gradle",
    lines: [
      "*.class",
      "*.jar",
      "*.war",
      "target/",
      "build/",
      ".gradle/",
      "local.properties",
      "gradle-app.setting",
      "!gradle-wrapper.jar",
    ],
  },
  {
    id: "android",
    title: "Android",
    lines: ["*.apk", "*.aab", "*.ap_", "*.dex", "captures/", ".cxx/", "output.json", "google-services.json"],
  },
  {
    id: "swift",
    title: "Swift and Xcode",
    lines: [
      "*.xcuserstate",
      "xcuserdata/",
      "DerivedData/",
      "*.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist",
      ".swiftpm/",
      "Pods/",
    ],
  },
  {
    id: "unity",
    title: "Unity",
    lines: [
      "[Ll]ibrary/",
      "[Tt]emp/",
      "[Oo]bj/",
      "[Bb]uild/",
      "[Bb]uilds/",
      "[Ll]ogs/",
      "[Uu]serSettings/",
      "*.pidb.meta",
      "*.pdb.meta",
      "sysinfo.txt",
    ],
  },
  {
    id: "php",
    title: "PHP and Laravel",
    lines: ["vendor/", "composer.phar", "storage/*.key", "public/storage", ".phpunit.result.cache"],
  },
  {
    id: "ruby",
    title: "Ruby and Rails",
    lines: [".bundle/", "vendor/bundle", "log/", "tmp/", "*.gem", "db/*.sqlite3", "storage/"],
  },
  {
    id: "terraform",
    title: "Terraform",
    lines: [
      ".terraform/",
      "*.tfstate",
      "*.tfstate.*",
      "crash.log",
      "override.tf",
      "override.tf.json",
      ".terraformrc",
      "terraform.rc",
    ],
  },
  {
    id: "docker",
    title: "Docker",
    lines: ["docker-compose.override.yml", ".docker/"],
  },
  {
    id: "macos",
    title: "macOS",
    lines: [".DS_Store", ".AppleDouble", ".LSOverride", "._*", ".Spotlight-V100", ".Trashes", "Icon\r"],
  },
  {
    id: "windows",
    title: "Windows",
    lines: ["Thumbs.db", "ehthumbs.db", "Desktop.ini", "$RECYCLE.BIN/", "*.lnk"],
  },
  {
    id: "linux",
    title: "Linux",
    lines: ["*~", ".fuse_hidden*", ".directory", ".Trash-*", ".nfs*"],
  },
  {
    id: "jetbrains",
    title: "JetBrains IDEs",
    lines: [".idea/", "*.iml", "*.iws", "*.ipr", "out/"],
  },
  {
    id: "vscode",
    title: "Visual Studio Code",
    lines: [".vscode/*", "!.vscode/settings.json", "!.vscode/extensions.json", "*.code-workspace"],
  },
];

/** Always worth having, and the reason most leaked keys leak. */
const SECRETS_SECTION: IgnoreSection = {
  id: "secrets",
  title: "Secrets — the ones that most often reach a public repository",
  lines: [
    ".env",
    ".env.*",
    "!.env.example",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "*.keystore",
    "*.jks",
    "id_rsa",
    "id_ed25519",
    "credentials.json",
    "service-account*.json",
    ".npmrc",
    ".netrc",
  ],
};

export const gitignoreBuild: PureOp = (_input, options): OpResult => {
  const chosen = IGNORE_SECTIONS.filter((section) => bool(options, section.id, false));
  const includeSecrets = bool(options, "secrets", true);
  const comments = bool(options, "comments", true);
  const sortLines = bool(options, "sorted", false);

  if (chosen.length === 0 && !includeSecrets) {
    throw new ToolError("Pick at least one stack, or leave the secrets block switched on.");
  }

  const sections = includeSecrets ? [SECRETS_SECTION, ...chosen] : chosen;
  const blocks: string[] = [];
  const seen = new Set<string>();
  let ruleCount = 0;

  for (const section of sections) {
    // A rule already written earlier means the same thing written twice; git
    // does not care, but a reader has to work out whether the second one differs.
    const lines = section.lines.filter((line) => {
      const rule = line.split("#")[0].trim();
      if (!rule) return true;
      if (seen.has(rule)) return false;
      seen.add(rule);
      return true;
    });
    if (lines.length === 0) continue;
    ruleCount += lines.length;

    const body = sortLines ? [...lines].sort((a, b) => a.localeCompare(b)) : lines;
    blocks.push(comments ? `# ${section.title}\n${body.join("\n")}` : body.join("\n"));
  }

  const header = comments
    ? `# Generated at tools.msrx.co.in — nothing about this repository left your browser.\n# Add project-specific rules below rather than editing the blocks above.\n`
    : "";

  return {
    output: `${header}${blocks.join("\n\n")}\n`,
    format: "code",
    stats: [
      { label: "Sections", value: String(blocks.length) },
      { label: "Rules", value: String(ruleCount) },
    ],
    note: "A .gitignore only stops files that are not tracked yet. Anything already committed stays in history until you rewrite it — `git rm --cached <file>` removes it going forward, not from past commits.",
  };
};

/* ------------------------------------------------------------------ */
/* Mock data                                                            */
/* ------------------------------------------------------------------ */

/**
 * A small xorshift PRNG so the same seed always produces the same dataset.
 *
 * `Math.random()` would make every run different, which is exactly wrong for
 * seed data: a fixture that changes between runs turns a failing test into a
 * mystery.
 */
function makeRandom(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 16777619);
  }
  if (state === 0) state = 0x9e3779b9;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 1_000_000) / 1_000_000;
  };
}

interface Locale {
  first: string[];
  last: string[];
  cities: string[];
  streets: string[];
  domains: string[];
  companies: string[];
  phone: (rand: () => number) => string;
  postcode: (rand: () => number) => string;
  region: string;
}

const LOCALES: Record<string, Locale> = {
  india: {
    first: [
      "Aarav", "Ananya", "Rohan", "Priya", "Vikram", "Meera", "Arjun", "Kavya", "Rahul", "Divya",
      "Siddharth", "Neha", "Karthik", "Ishita", "Aditya", "Sneha", "Rajesh", "Pooja", "Nikhil", "Anjali",
      "Mrinal", "Deepika", "Sanjay", "Ritu", "Harsh", "Lakshmi", "Varun", "Shreya",
    ],
    last: [
      "Sharma", "Patel", "Reddy", "Nair", "Iyer", "Singh", "Gupta", "Desai", "Rao", "Mehta",
      "Chowdhury", "Banerjee", "Kulkarni", "Joshi", "Verma", "Pillai", "Bose", "Kapoor", "Saikia", "Bora",
    ],
    cities: [
      "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata", "Ahmedabad",
      "Jaipur", "Kochi", "Guwahati", "Indore", "Chandigarh", "Coimbatore",
    ],
    streets: ["MG Road", "Brigade Road", "Anna Salai", "Linking Road", "Park Street", "FC Road", "Residency Road"],
    domains: ["gmail.com", "outlook.com", "yahoo.in", "rediffmail.com", "example.in"],
    companies: ["Infotech", "Systems", "Labs", "Solutions", "Technologies", "Ventures", "Digital"],
    phone: (rand) => `+91 ${Math.floor(6 + rand() * 4)}${String(Math.floor(rand() * 1e9)).padStart(9, "0")}`,
    postcode: (rand) => String(Math.floor(110000 + rand() * 690000)),
    region: "Karnataka",
  },
  us: {
    first: [
      "James", "Mary", "Robert", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara",
      "Grace", "Ada", "Marcus", "Nina", "Oscar", "Ruth", "Ethan", "Chloe",
    ],
    last: [
      "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
      "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson",
    ],
    cities: [
      "Springfield", "Riverside", "Franklin", "Georgetown", "Madison", "Arlington", "Clinton", "Fairview",
    ],
    streets: ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Park Blvd", "Elm St"],
    domains: ["gmail.com", "outlook.com", "example.com", "mail.com"],
    companies: ["Industries", "Group", "Partners", "Holdings", "Works", "Co"],
    phone: (rand) => `+1 (${Math.floor(200 + rand() * 700)}) ${String(Math.floor(rand() * 1000)).padStart(3, "0")}-${String(Math.floor(rand() * 10000)).padStart(4, "0")}`,
    postcode: (rand) => String(Math.floor(10000 + rand() * 89999)),
    region: "CA",
  },
  uk: {
    first: [
      "Oliver", "Amelia", "Harry", "Isla", "George", "Ava", "Noah", "Emily", "Leo", "Sophie",
      "Alan", "Beatrice", "Callum", "Freya",
    ],
    last: [
      "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Evans", "Thomas", "Roberts", "Walker",
    ],
    cities: ["London", "Manchester", "Bristol", "Leeds", "Edinburgh", "Cardiff", "Norwich", "York"],
    streets: ["High Street", "Station Road", "Church Lane", "Victoria Road", "Mill Lane"],
    domains: ["gmail.com", "outlook.co.uk", "example.co.uk", "btinternet.com"],
    companies: ["Ltd", "Group", "Services", "Partners", "Consulting"],
    phone: (rand) => `+44 7${String(Math.floor(rand() * 1e9)).padStart(9, "0")}`,
    postcode: (rand) => {
      const letters = "ABCDEFGHKLMNPRSTUVWXY";
      const pick = () => letters[Math.floor(rand() * letters.length)];
      return `${pick()}${pick()}${Math.floor(rand() * 9) + 1} ${Math.floor(rand() * 9)}${pick()}${pick()}`;
    },
    region: "England",
  },
};

type FieldBuilder = (rand: () => number, locale: Locale, row: number) => unknown;

const FIELDS: { id: string; key: string; build: FieldBuilder }[] = [
  { id: "fieldId", key: "id", build: (_r, _l, row) => row + 1 },
  { id: "fieldUuid", key: "uuid", build: (rand) =>
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
        const value = Math.floor(rand() * 16);
        return (char === "x" ? value : (value & 0x3) | 0x8).toString(16);
      }),
  },
  { id: "fieldName", key: "name", build: (rand, locale) =>
      `${locale.first[Math.floor(rand() * locale.first.length)]} ${locale.last[Math.floor(rand() * locale.last.length)]}`,
  },
  { id: "fieldEmail", key: "email", build: (rand, locale) => {
      const first = locale.first[Math.floor(rand() * locale.first.length)].toLowerCase();
      const last = locale.last[Math.floor(rand() * locale.last.length)].toLowerCase();
      const domain = locale.domains[Math.floor(rand() * locale.domains.length)];
      return `${first}.${last}${Math.floor(rand() * 90) + 10}@${domain}`;
    },
  },
  { id: "fieldPhone", key: "phone", build: (rand, locale) => locale.phone(rand) },
  { id: "fieldAddress", key: "address", build: (rand, locale) =>
      `${Math.floor(rand() * 400) + 1} ${locale.streets[Math.floor(rand() * locale.streets.length)]}`,
  },
  { id: "fieldCity", key: "city", build: (rand, locale) => locale.cities[Math.floor(rand() * locale.cities.length)] },
  { id: "fieldPostcode", key: "postcode", build: (rand, locale) => locale.postcode(rand) },
  { id: "fieldCompany", key: "company", build: (rand, locale) =>
      `${locale.last[Math.floor(rand() * locale.last.length)]} ${locale.companies[Math.floor(rand() * locale.companies.length)]}`,
  },
  { id: "fieldDate", key: "created_at", build: (rand) => {
      const start = Date.UTC(2020, 0, 1);
      const span = Date.UTC(2026, 0, 1) - start;
      return new Date(start + rand() * span).toISOString().slice(0, 19).replace("T", " ");
    },
  },
  { id: "fieldPrice", key: "price", build: (rand) => Math.round(rand() * 500000) / 100 },
  { id: "fieldBool", key: "active", build: (rand) => rand() > 0.3 },
];

function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function csvCell(value: unknown): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const mockData: PureOp = (_input, options): OpResult => {
  const rows = Math.max(1, Math.min(1000, num(options, "rows", 10)));
  const format = str(options, "format", "json");
  const localeId = str(options, "locale", "india");
  const table = str(options, "table", "users").trim() || "users";
  const seed = str(options, "seed", "msrx").trim() || "msrx";

  const locale = LOCALES[localeId] ?? LOCALES.india;
  const chosen = FIELDS.filter((field) => bool(options, field.id, field.id !== "fieldPostcode"));
  if (chosen.length === 0) throw new ToolError("Switch on at least one field — a row with no columns is not data.");

  const rand = makeRandom(seed);
  const records = Array.from({ length: rows }, (_, row) => {
    const record: Record<string, unknown> = {};
    for (const field of chosen) record[field.key] = field.build(rand, locale, row);
    return record;
  });

  const keys = chosen.map((field) => field.key);
  let output: string;
  let outputFormat: OpResult["format"] = "json";

  if (format === "csv") {
    output = [keys.join(","), ...records.map((record) => keys.map((key) => csvCell(record[key])).join(","))].join("\n");
    outputFormat = "csv";
  } else if (format === "ndjson") {
    output = records.map((record) => JSON.stringify(record)).join("\n");
    outputFormat = "code";
  } else if (format === "sql") {
    const columns = keys.map((key) => `\`${key}\``).join(", ");
    const values = records
      .map((record) => `  (${keys.map((key) => sqlLiteral(record[key])).join(", ")})`)
      .join(",\n");
    output = `INSERT INTO \`${table}\` (${columns}) VALUES\n${values};`;
    outputFormat = "code";
  } else {
    output = JSON.stringify(records, null, 2);
  }

  return {
    output,
    format: outputFormat,
    stats: [
      { label: "Rows", value: String(rows) },
      { label: "Columns", value: String(keys.length) },
      { label: "Seed", value: seed },
    ],
    note: "The same seed always produces the same rows, so a fixture stays stable between runs. These names and addresses are invented — none of them belongs to a real person.",
  };
};
