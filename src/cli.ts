import { readFileSync } from "node:fs";
import { buildLedger, type LatencyLedgerInput } from "./index.js";

const inputPath = process.argv[2] ?? "fixtures/hft-latency-sample.json";
const raw = readFileSync(inputPath, "utf8");
const input = JSON.parse(raw) as LatencyLedgerInput;
const ledger = buildLedger(input);

console.log(JSON.stringify(ledger, null, 2));
