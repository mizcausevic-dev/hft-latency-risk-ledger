import { readFileSync } from "node:fs";
import { buildLedger, formatUsd, type LatencyLedgerInput } from "../src/index.js";

const input = JSON.parse(readFileSync("fixtures/hft-latency-sample.json", "utf8")) as LatencyLedgerInput;
const ledger = buildLedger(input);

console.log(`portfolio=${ledger.portfolio}`);
console.log(`risk=${ledger.aggregateRiskScore}`);
console.log(`exposure=${formatUsd(ledger.totalExposureUsd)}`);
console.log(`recommendation=${ledger.primaryRecommendation}`);
