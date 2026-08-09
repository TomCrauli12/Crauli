import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";

const root = normalize(join(import.meta.dirname, ".."));
const errors = [];
const required = [
  "index.html",
  "favicon.svg",
  ".nojekyll",
  "style.css",
  "translations.js",
  "script.js",
  "resume.pdf"
];

for (const relativePath of required) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    errors.push(`Missing required file: ${relativePath}`);
  }
}

const htmlPath = join(root, "index.html");
const html = readFileSync(htmlPath, "utf8");
const css = readFileSync(join(root, "style.css"), "utf8");
const mainJs = readFileSync(join(root, "script.js"), "utf8");
const i18nJs = readFileSync(join(root, "translations.js"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const h1Count = (html.match(/<h1\b/gi) || []).length;
if (h1Count !== 1) errors.push(`Expected exactly one h1, found ${h1Count}`);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(match[1])) errors.push(`Broken in-page link: #${match[1]}`);
}

for (const match of html.matchAll(/(?:href|src)="(\.\/[^"#?]+)"/g)) {
  const relativePath = match[1].replace(/^\.\//, "");
  const absolutePath = normalize(join(dirname(htmlPath), relativePath));
  if (!absolutePath.startsWith(root) || !existsSync(absolutePath)) {
    errors.push(`Broken local asset: ${match[1]}`);
  }
}

const textKeys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((match) => match[1]);
const ariaKeys = [...html.matchAll(/data-i18n-aria="([^"]+)"/g)].map((match) => match[1]);
for (const key of new Set([...textKeys, ...ariaKeys])) {
  if (!new RegExp(`\\b${key}\\s*:`).test(i18nJs)) {
    errors.push(`Missing English translation: ${key}`);
  }
}

const forbidden = [
  ["React runtime", /(?:from\s+["']react["']|ReactDOM|createRoot\s*\()/],
  ["Vue runtime", /(?:from\s+["']vue["']|createApp\s*\()/],
  ["framework CDN", /(?:unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/],
  ["Vite entry", /\/src\/main\.[jt]sx?/]
];
for (const [label, pattern] of forbidden) {
  if (pattern.test(html) || pattern.test(mainJs)) errors.push(`Forbidden dependency found: ${label}`);
}

if (Object.keys(packageJson.dependencies || {}).length > 0) {
  errors.push("package.json must not contain runtime dependencies");
}

if (!css.includes("@media (prefers-reduced-motion: reduce)")) {
  errors.push("Reduced-motion styles are missing");
}

if (!html.includes('class="skip-link"')) errors.push("Skip link is missing");
if (!html.includes('meta name="viewport"')) errors.push("Viewport meta tag is missing");

if (errors.length) {
  console.error("Validation failed:");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Validation passed: ${required.length} required files, ${ids.size} IDs, ${new Set(textKeys).size} translation keys.`);
