import { describe, expect, it } from "vitest";
import { buildLedger, scoreLane, type LatencyLedgerInput } from "../src/index.js";
import fixture from "../fixtures/hft-latency-sample.json" with { type: "json" };

describe("hft latency ledger", () => {
  it("orders the riskiest lane first", () => {
    const ledger = buildLedger(fixture as LatencyLedgerInput);
    expect(ledger.findings[0].venue).toBe("CME Globex");
    expect(ledger.totalExposureUsd).toBeGreaterThan(100000);
    expect(ledger.primaryRecommendation).toContain("CME Globex");
  });

  it("increases risk when packet loss and stale events rise", () => {
    const base = (fixture as LatencyLedgerInput).lanes[1];
    const normal = scoreLane(base, 62);
    const degraded = scoreLane({ ...base, packetLossBps: 25, staleQuoteEvents: 40 }, 62);
    expect(degraded.marketRiskScore).toBeGreaterThan(normal.marketRiskScore);
    expect(degraded.executionExposureUsd).toBeGreaterThan(normal.executionExposureUsd);
  });
});
