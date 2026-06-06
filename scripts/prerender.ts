import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { renderPage } from "../src/app.js";
import type { LatencyLedgerInput } from "../src/index.js";

const input = JSON.parse(readFileSync("fixtures/hft-latency-sample.json", "utf8")) as LatencyLedgerInput;
mkdirSync("site", { recursive: true });
writeFileSync("site/index.html", renderPage(input));
writeFileSync("site/robots.txt", "User-agent: *\nAllow: /\n");
