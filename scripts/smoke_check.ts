import { readFileSync } from "node:fs";

const html = readFileSync("site/index.html", "utf8");
const required = [
  "HFT Latency Risk Ledger",
  "Latency risk becomes board-readable",
  "NYSE Arca",
  "CME Globex",
  "Primary recommendation"
];

for (const needle of required) {
  if (!html.includes(needle)) {
    throw new Error(`Missing smoke marker: ${needle}`);
  }
}

console.log("smoke ok");
