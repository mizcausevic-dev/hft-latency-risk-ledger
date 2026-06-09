import express from "express";
import { readFileSync } from "node:fs";
import { buildLedger, formatUsd, type LatencyLedgerInput } from "./index.js";

export function renderPage(input: LatencyLedgerInput): string {
  const ledger = buildLedger(input);
  const cards = ledger.findings
    .map(
      (lane) => `
        <article class="lane ${lane.tier}">
          <span>${lane.tier}</span>
          <h3>${lane.venue}</h3>
          <p>${lane.boardNarrative}</p>
          <dl>
            <div><dt>Risk</dt><dd>${lane.marketRiskScore}</dd></div>
            <div><dt>p99</dt><dd>${lane.p99Micros}us</dd></div>
            <div><dt>Exposure</dt><dd>${formatUsd(lane.executionExposureUsd)}</dd></div>
          </dl>
          <strong>${lane.nextAction}</strong>
        </article>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HFT Latency Risk Ledger</title>
  <meta name="description" content="Board-ready latency risk ledger for HFT execution exposure, tail latency, jitter, packet loss, and venue remediation posture." />
  <style>
    :root {
      --bg: #050812;
      --panel: #0d1727;
      --panel-2: #121c2e;
      --text: #f4f1ea;
      --muted: #a8b3c7;
      --line: rgba(98, 238, 219, 0.22);
      --cyan: #25d7ef;
      --mint: #5ff0b6;
      --amber: #ffd166;
      --rose: #ff6b87;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 85% 10%, rgba(99, 68, 255, 0.18), transparent 32rem),
        radial-gradient(circle at 15% 15%, rgba(37, 215, 239, 0.14), transparent 28rem),
        var(--bg);
    }
    main { width: min(1180px, calc(100% - 40px)); margin: 0 auto; padding: 56px 0; }
    .hero {
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: clamp(28px, 5vw, 64px);
      background: linear-gradient(135deg, rgba(13, 23, 39, 0.96), rgba(8, 11, 24, 0.92));
      box-shadow: 0 24px 90px rgba(0, 0, 0, 0.38);
    }
    .eyebrow {
      color: var(--mint);
      font-family: "Consolas", monospace;
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    h1 {
      max-width: 980px;
      margin: 18px 0 18px;
      font-size: clamp(3rem, 8vw, 7.2rem);
      line-height: 0.9;
      letter-spacing: -0.075em;
    }
    .lede { max-width: 760px; color: var(--muted); font-size: 1.25rem; line-height: 1.7; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 34px; }
    .metric {
      background: var(--panel-2);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 20px;
    }
    .metric small { color: var(--muted); text-transform: uppercase; letter-spacing: 0.12em; }
    .metric b { display: block; margin-top: 10px; font-size: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 22px; }
    .lane {
      min-height: 250px;
      padding: 24px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 22px;
      background: rgba(13, 23, 39, 0.88);
    }
    .lane span {
      color: var(--cyan);
      font-family: "Consolas", monospace;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.76rem;
    }
    .lane.escalate { border-color: rgba(255,107,135,0.42); }
    .lane.contain { border-color: rgba(255,209,102,0.38); }
    .lane h3 { font-size: 1.7rem; margin: 14px 0 10px; }
    .lane p { color: var(--muted); line-height: 1.6; }
    dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0; }
    dt { color: var(--muted); font-size: 0.76rem; text-transform: uppercase; }
    dd { margin: 5px 0 0; font-size: 1.25rem; font-weight: 800; }
    strong { color: var(--text); line-height: 1.45; }
    .proof-pack { display: grid; grid-template-columns: 1.05fr 1fr 1fr; gap: 16px; margin-top: 22px; }
    .proof-card {
      background: linear-gradient(180deg, rgba(18,28,46,.94), rgba(10,16,28,.92));
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 20px;
      padding: 22px;
      box-shadow: 0 16px 42px rgba(0,0,0,.18);
    }
    .proof-card small { display: block; color: var(--cyan); font-family: "Consolas", monospace; text-transform: uppercase; letter-spacing: .14em; font-size: .72rem; margin-bottom: 10px; }
    .proof-card h2 { font-size: 1.35rem; margin: 0 0 10px; letter-spacing: -.03em; }
    .proof-card p { margin: 0; color: var(--muted); line-height: 1.62; }
    .proof-card ul { margin: 0; padding-left: 18px; color: var(--muted); line-height: 1.75; }
    .proof-card li::marker { color: var(--cyan); }
    footer { color: var(--muted); margin-top: 36px; font-family: "Consolas", monospace; }
    @media (max-width: 820px) {
      .metrics, .grid { grid-template-columns: 1fr; }
      dl { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <main>
    <section class="hero">
      <div class="eyebrow">FinTech and Banking / Rust + Python</div>
      <h1>Latency risk becomes board-readable before execution quality breaks.</h1>
      <p class="lede">HFT Latency Risk Ledger turns p99 latency, jitter, packet loss, stale quote events, and venue ownership into one executive risk surface for market-structure and platform leaders.</p>
      <div class="metrics">
        <div class="metric"><small>Aggregate risk</small><b>${ledger.aggregateRiskScore}</b></div>
        <div class="metric"><small>Execution exposure</small><b>${formatUsd(ledger.totalExposureUsd)}</b></div>
        <div class="metric"><small>Escalations</small><b>${ledger.highRiskVenues}</b></div>
        <div class="metric"><small>Venues tracked</small><b>${ledger.findings.length}</b></div>
      </div>
    </section>
    <section class="grid">${cards}</section>
    <section class="proof-pack" aria-label="Evidence and board pack">
      <article class="proof-card">
        <small>Evidence matrix</small>
        <h2>What leaders can inspect</h2>
        <p>Each lane keeps the source signal, owner, risk posture, and next decision in the same public proof surface instead of hiding the work in screenshots.</p>
      </article>
      <article class="proof-card">
        <small>Board pack builder</small>
        <h2>How the packet gets used</h2>
        <ul><li>Translate technical telemetry into decision language.</li><li>Separate watch, contain, and escalation posture.</li><li>Keep remediation evidence attached to accountable owners.</li></ul>
      </article>
      <article class="proof-card">
        <small>Public-demo boundary</small>
        <h2>What is intentionally synthetic</h2>
        <p>Demo fixtures are synthetic and credential-free; the pattern is reusable for real diligence packets without exposing customer or regulated data.</p>
      </article>
    </section>
    <section class="proof-pack" aria-label="Product depth and shared pattern">
      <article class="proof-card">
        <small>Product purpose</small>
        <h2>What this product does</h2>
        <p>A board-ready latency evidence ledger for trading venues where p99 latency, jitter, packet loss, stale quotes, and notional exposure need to be understood by risk, technology, and investment leadership at the same time.</p>
      </article>
      <article class="proof-card">
        <small>Go-to-market lens</small>
        <h2>Why buyers would care</h2>
        <p>For portfolio and fintech buyers, the page explains where execution quality can become revenue leakage, regulatory concern, or customer trust risk.</p>
      </article>
      <article class="proof-card">
        <small>Value architecture</small>
        <h2>How it turns into action</h2>
        <p>It turns market-structure telemetry into ranked remediation: which venue needs containment, which owner is accountable, and how much execution exposure is at stake.</p>
      </article>
      <article class="proof-card">
        <small>Technical proof</small>
        <h2>How reviewers can trust it</h2>
        <p>The proof stays inspectable through typed scoring, synthetic fixtures, CLI output, an app route, static prerendering, and a sitemap.</p>
      </article>
      <article class="proof-card">
        <small>What these repos have in common</small>
        <h2>Platform complexity becomes board-ready operating proof.</h2>
        <p>Each repo names a buyer pain, exposes an evidence model, produces a reusable artifact, and keeps the public page safe with synthetic data instead of credentials or customer exports.</p>
      </article>
      <article class="proof-card">
        <small>Interlinks</small>
        <h2>Where this fits</h2>
        <p><a href="https://portfolio.kineticgain.com/">Portfolio</a> · <a href="https://kineticgain.com/">Kinetic Gain</a> · <a href="https://github.com/mizcausevic-dev/hft-latency-risk-ledger">GitHub</a></p>
      </article>
    </section><footer>Primary recommendation: ${ledger.primaryRecommendation}</footer>
  </main>
</body>
</html>`;
}

export function createApp() {
  const app = express();
  const input = JSON.parse(readFileSync("fixtures/hft-latency-sample.json", "utf8")) as LatencyLedgerInput;
  app.get("/", (_req, res) => res.type("html").send(renderPage(input)));
  app.get("/api/ledger", (_req, res) => res.json(buildLedger(input)));
  return app;
}

if (process.argv[1]?.endsWith("app.js")) {
  createApp().listen(4173, () => {
    console.log("hft-latency-risk-ledger listening on http://localhost:4173");
  });
}
