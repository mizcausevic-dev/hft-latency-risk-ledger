use anyhow::Result;
use clap::{Parser, ValueEnum};
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

#[derive(Parser)]
#[command(name = "hft-ledger-cli")]
#[command(about = "Score HFT latency lanes into a board-ready risk ledger.")]
struct Args {
    input: PathBuf,
    #[arg(long, value_enum, default_value_t = Format::Json)]
    format: Format,
}

#[derive(Clone, ValueEnum)]
enum Format {
    Json,
    Markdown,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Input {
    as_of: String,
    portfolio: String,
    risk_tolerance_score: f64,
    lanes: Vec<Lane>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct Lane {
    venue: String,
    strategy: String,
    region: String,
    p50_micros: f64,
    p99_micros: f64,
    jitter_micros: f64,
    packet_loss_bps: f64,
    stale_quote_events: f64,
    orders_at_risk: f64,
    daily_notional_usd: f64,
    owner: String,
    control: String,
    next_action: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Finding {
    #[serde(flatten)]
    lane: Lane,
    latency_pressure: f64,
    market_risk_score: f64,
    execution_exposure_usd: f64,
    tier: String,
    board_narrative: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct Ledger {
    as_of: String,
    portfolio: String,
    aggregate_risk_score: f64,
    total_exposure_usd: f64,
    high_risk_venues: usize,
    primary_recommendation: String,
    findings: Vec<Finding>,
}

fn clamp(value: f64) -> f64 {
    value.clamp(0.0, 100.0)
}

fn round(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn score_lane(lane: Lane, risk_tolerance_score: f64) -> Finding {
    let tail_ratio = lane.p99_micros / lane.p50_micros.max(1.0);
    let tail_pressure = clamp((tail_ratio - 3.0) * 14.0);
    let jitter_pressure = clamp(lane.jitter_micros / 2.0);
    let loss_pressure = clamp(lane.packet_loss_bps * 4.5);
    let stale_pressure = clamp(lane.stale_quote_events * 2.2);
    let tolerance_penalty = (70.0 - risk_tolerance_score).clamp(0.0, 35.0);
    let latency_pressure =
        clamp(tail_pressure * 0.32 + jitter_pressure * 0.25 + loss_pressure * 0.25 + stale_pressure * 0.18);
    let market_risk_score = clamp(latency_pressure + tolerance_penalty);
    let execution_exposure_usd = round(lane.daily_notional_usd * (0.00018 + market_risk_score / 100000.0));
    let tier = if market_risk_score >= 72.0 {
        "escalate"
    } else if market_risk_score >= 52.0 {
        "contain"
    } else {
        "watch"
    };
    let board_narrative = match tier {
        "escalate" => format!(
            "{} is creating board-visible execution exposure because tail latency, packet loss, or stale quote events are already above tolerance.",
            lane.venue
        ),
        "contain" => format!("{} needs containment before the next high-notional trading window.", lane.venue),
        _ => format!(
            "{} remains within watch posture, but latency evidence should stay attached to the owner and control.",
            lane.venue
        ),
    };

    Finding {
        lane,
        latency_pressure: round(latency_pressure),
        market_risk_score: round(market_risk_score),
        execution_exposure_usd,
        tier: tier.to_string(),
        board_narrative,
    }
}

fn build_ledger(input: Input) -> Ledger {
    let mut findings: Vec<Finding> = input
        .lanes
        .into_iter()
        .map(|lane| score_lane(lane, input.risk_tolerance_score))
        .collect();
    findings.sort_by(|a, b| b.market_risk_score.total_cmp(&a.market_risk_score));

    let total_exposure_usd = round(findings.iter().map(|f| f.execution_exposure_usd).sum());
    let aggregate_risk_score = round(findings.iter().map(|f| f.market_risk_score).sum::<f64>() / findings.len() as f64);
    let high_risk_venues = findings.iter().filter(|f| f.tier == "escalate").count();
    let top = findings.first().expect("ledger requires at least one finding");
    let primary_recommendation = format!("{}: {}", top.lane.venue, top.lane.next_action);

    Ledger {
        as_of: input.as_of,
        portfolio: input.portfolio,
        aggregate_risk_score,
        total_exposure_usd,
        high_risk_venues,
        primary_recommendation,
        findings,
    }
}

fn main() -> Result<()> {
    let args = Args::parse();
    let raw = fs::read_to_string(args.input)?;
    let input: Input = serde_json::from_str(&raw)?;
    let ledger = build_ledger(input);

    match args.format {
        Format::Json => println!("{}", serde_json::to_string_pretty(&ledger)?),
        Format::Markdown => {
            println!("# HFT Latency Risk Ledger");
            println!();
            println!("Aggregate risk: {}", ledger.aggregate_risk_score);
            println!("Execution exposure: ${:.0}", ledger.total_exposure_usd);
            println!("Primary recommendation: {}", ledger.primary_recommendation);
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn degraded_lane_scores_higher() {
        let lane = Lane {
            venue: "Test".to_string(),
            strategy: "market making".to_string(),
            region: "NY4".to_string(),
            p50_micros: 50.0,
            p99_micros: 800.0,
            jitter_micros: 120.0,
            packet_loss_bps: 14.0,
            stale_quote_events: 18.0,
            orders_at_risk: 1000.0,
            daily_notional_usd: 100000000.0,
            owner: "routing".to_string(),
            control: "circuit breaker".to_string(),
            next_action: "contain".to_string(),
        };
        let finding = score_lane(lane, 62.0);
        assert!(finding.market_risk_score > 55.0);
        assert!(finding.execution_exposure_usd > 0.0);
    }
}
