import argparse
import json
from pathlib import Path


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _score_lane(lane: dict, risk_tolerance_score: float) -> dict:
    tail_ratio = lane["p99Micros"] / max(lane["p50Micros"], 1)
    latency_pressure = _clamp(
        _clamp((tail_ratio - 3) * 14) * 0.32
        + _clamp(lane["jitterMicros"] / 2) * 0.25
        + _clamp(lane["packetLossBps"] * 4.5) * 0.25
        + _clamp(lane["staleQuoteEvents"] * 2.2) * 0.18
    )
    market_risk_score = round(_clamp(latency_pressure + max(0, min(35, 70 - risk_tolerance_score))), 2)
    exposure = round(lane["dailyNotionalUsd"] * (0.00018 + market_risk_score / 100000), 2)
    tier = "escalate" if market_risk_score >= 72 else "contain" if market_risk_score >= 52 else "watch"
    return {
        **lane,
        "latencyPressure": round(latency_pressure, 2),
        "marketRiskScore": market_risk_score,
        "executionExposureUsd": exposure,
        "tier": tier,
        "evidenceRequired": [
            "p50/p99 latency sample",
            "packet loss window",
            "stale quote event log",
            "owner remediation note",
        ],
    }


def build_pack(input_path: str | Path) -> dict:
    payload = json.loads(Path(input_path).read_text(encoding="utf-8"))
    findings = sorted(
        (_score_lane(lane, payload["riskToleranceScore"]) for lane in payload["lanes"]),
        key=lambda lane: lane["marketRiskScore"],
        reverse=True,
    )
    total_exposure = round(sum(lane["executionExposureUsd"] for lane in findings), 2)
    top = findings[0]
    return {
        "title": "HFT Latency Risk Diligence Pack",
        "portfolio": payload["portfolio"],
        "asOf": payload["asOf"],
        "totalExecutionExposureUsd": total_exposure,
        "primaryRecommendation": f"{top['venue']}: {top['nextAction']}",
        "boardQuestions": [
            "Which venue creates the largest execution-quality exposure?",
            "Where is tail latency already above strategy tolerance?",
            "Which owner is accountable for the next containment action?",
        ],
        "findings": findings,
    }


def _markdown(pack: dict) -> str:
    lines = [
        f"# {pack['title']}",
        "",
        f"Portfolio: {pack['portfolio']}",
        f"Execution exposure: ${pack['totalExecutionExposureUsd']:,.0f}",
        f"Primary recommendation: {pack['primaryRecommendation']}",
        "",
        "## Board questions",
    ]
    lines.extend(f"- {question}" for question in pack["boardQuestions"])
    lines.append("")
    lines.append("## Findings")
    for finding in pack["findings"]:
        lines.append(
            f"- {finding['venue']} | {finding['tier']} | risk {finding['marketRiskScore']} | "
            f"exposure ${finding['executionExposureUsd']:,.0f}"
        )
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("--format", choices=["json", "markdown"], default="json")
    args = parser.parse_args()
    pack = build_pack(args.input)
    print(_markdown(pack) if args.format == "markdown" else json.dumps(pack, indent=2))
