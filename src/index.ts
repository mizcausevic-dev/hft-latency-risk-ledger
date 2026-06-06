export interface LatencyLane {
  venue: string;
  strategy: string;
  region: string;
  p50Micros: number;
  p99Micros: number;
  jitterMicros: number;
  packetLossBps: number;
  staleQuoteEvents: number;
  ordersAtRisk: number;
  dailyNotionalUsd: number;
  owner: string;
  control: string;
  nextAction: string;
}

export interface LatencyLedgerInput {
  asOf: string;
  portfolio: string;
  riskToleranceScore: number;
  lanes: LatencyLane[];
}

export interface LaneFinding extends LatencyLane {
  latencyPressure: number;
  marketRiskScore: number;
  executionExposureUsd: number;
  tier: "watch" | "contain" | "escalate";
  boardNarrative: string;
}

export interface LedgerSummary {
  asOf: string;
  portfolio: string;
  aggregateRiskScore: number;
  totalExposureUsd: number;
  highRiskVenues: number;
  primaryRecommendation: string;
  findings: LaneFinding[];
}

const clamp = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, value));

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function scoreLane(lane: LatencyLane, riskToleranceScore: number): LaneFinding {
  const tailRatio = lane.p99Micros / Math.max(lane.p50Micros, 1);
  const tailPressure = clamp((tailRatio - 3) * 14);
  const jitterPressure = clamp(lane.jitterMicros / 2);
  const lossPressure = clamp(lane.packetLossBps * 4.5);
  const stalePressure = clamp(lane.staleQuoteEvents * 2.2);
  const tolerancePenalty = clamp(70 - riskToleranceScore, 0, 35);
  const latencyPressure = clamp(
    tailPressure * 0.32 + jitterPressure * 0.25 + lossPressure * 0.25 + stalePressure * 0.18
  );
  const marketRiskScore = clamp(latencyPressure + tolerancePenalty);
  const exposureRate = 0.00018 + marketRiskScore / 100000;
  const executionExposureUsd = round(lane.dailyNotionalUsd * exposureRate);
  const tier = marketRiskScore >= 72 ? "escalate" : marketRiskScore >= 52 ? "contain" : "watch";
  const boardNarrative =
    tier === "escalate"
      ? `${lane.venue} is creating board-visible execution exposure because tail latency, packet loss, or stale quote events are already above tolerance.`
      : tier === "contain"
        ? `${lane.venue} needs containment before the next high-notional trading window.`
        : `${lane.venue} remains within watch posture, but latency evidence should stay attached to the owner and control.`;

  return {
    ...lane,
    latencyPressure: round(latencyPressure),
    marketRiskScore: round(marketRiskScore),
    executionExposureUsd,
    tier,
    boardNarrative
  };
}

export function buildLedger(input: LatencyLedgerInput): LedgerSummary {
  if (!input.lanes.length) {
    throw new Error("At least one latency lane is required.");
  }

  const findings = input.lanes
    .map((lane) => scoreLane(lane, input.riskToleranceScore))
    .sort((a, b) => b.marketRiskScore - a.marketRiskScore);
  const totalExposureUsd = round(findings.reduce((sum, lane) => sum + lane.executionExposureUsd, 0));
  const aggregateRiskScore = round(
    findings.reduce((sum, lane) => sum + lane.marketRiskScore, 0) / findings.length
  );
  const highRiskVenues = findings.filter((lane) => lane.tier === "escalate").length;
  const top = findings[0];
  const primaryRecommendation = `${top.venue}: ${top.nextAction}`;

  return {
    asOf: input.asOf,
    portfolio: input.portfolio,
    aggregateRiskScore,
    totalExposureUsd,
    highRiskVenues,
    primaryRecommendation,
    findings
  };
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}
