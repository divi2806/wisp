# Wisp — AI Co-Pilot for Solana DeFi

> Unify your entire Solana DeFi portfolio, get AI-powered risk alerts, backtest strategies against 2 years of real data, and paper trade with zero capital at risk — all with read-only wallet access.

---

## The Problem

Solana DeFi is one of the most capital-efficient ecosystems in crypto. It's also one of the most operationally painful to participate in.

An active user managing positions across Kamino, Jupiter, Drift, Orca, and Marinade is effectively running a small hedge fund — but without the tools a hedge fund would have. The daily reality looks like this:

- **7+ browser tabs open** — one per protocol, each with its own dashboard
- **No unified view** of total portfolio value, aggregate APY, or cross-protocol risk
- **Liquidations that could have been avoided** — because nobody was watching the LTV ratio at 2am
- **Strategies deployed blind** — no way to test "what would have happened if I put $10k here 6 months ago?"
- **Information overload** — APY, APR, IL, funding rates, liquidation thresholds — impossible to synthesize across protocols in real time

No existing tool solves all of this for Solana DeFi users in one place.

---

## The Solution

Wisp is an AI co-pilot that plugs into your Solana wallet (read-only — no signing permissions ever) and gives you four things:

### 1. Unified Portfolio Dashboard
Every position across every protocol in one screen. Total value, per-position APY, 24h P&L, risk scores, sparklines. Kamino, Jupiter, Drift, Orca, Raydium, Marinade — all of it, aggregated via Helius RPC in under 100ms.

### 2. AI-Powered Insights
The AI engine monitors your portfolio 24/7 and surfaces specific, actionable alerts — not generic advice. Your positions, right now:
- *"Your Drift SOL ×3 perp is at 78% liquidation LTV — consider reducing size."*
- *"Kamino USDC vault APY dropped 3.2% in 24h — three better alternatives exist."*
- *"SOL-USDC funding rate flipped negative — you're earning carry, not paying it."*

### 3. Strategy Backtesting
Input any strategy — protocol, amount, entry/exit conditions, time range — and run it against 2 years of real Solana DeFi historical data. See exact P&L curves, max drawdown, Sharpe ratio, and benchmark comparison. Know your edge before you risk real capital.

### 4. Paper Trading
Simulate live trades in real market conditions with zero real money. Live price feeds, real protocol state, realistic results. Graduate from paper trading to live positions when you're confident in the strategy.

---

## Supported Protocols

| Protocol   | Category             |
|------------|----------------------|
| Kamino     | Lending & Yield      |
| Jupiter    | DEX & Perps          |
| Drift      | Perpetuals           |
| Orca       | AMM                  |
| Raydium    | AMM & Launchpad      |
| Marinade   | Liquid Staking       |
| Marginfi   | Money Market         |
| Jito       | MEV & Staking        |
| Sanctum    | LST Liquidity        |
| Zeta       | Options & Perps      |
| +2 more    | —                    |

---

## Current State

**This repo is the frontend-only marketing landing page.** The backend (wallet integration, Helius data layer, AI engine, backtesting pipeline) is planned for subsequent milestones.

What exists today:
- Fully animated landing page (Next.js 15, Framer Motion)
- Interactive AI mascot ("Wisp") with 8 mood states
- Feature showcase with realistic dashboard/chart mockups
- How It Works walkthrough
- Portfolio preview with sample data
- Protocol integration marquee
- Waitlist email capture with animated success modal

---

## Tech Stack

| Layer         | Technology                        |
|---------------|-----------------------------------|
| Framework     | Next.js 15 (App Router)           |
| Language      | TypeScript                        |
| Styling       | Tailwind CSS v4                   |
| Animation     | Framer Motion 12                  |
| Smooth Scroll | Lenis                             |
| Icons         | Lucide React                      |

**Planned backend stack:**

| Layer              | Technology                     |
|--------------------|--------------------------------|
| On-chain data      | Helius RPC                     |
| Protocol parsers   | Kamino SDK, Jupiter SDK, etc.  |
| AI engine          | Claude API (Anthropic)         |
| Historical data    | Custom Solana DeFi data pipeline |

---

## Planned Architecture

```
User Wallet (read-only)
        │
        ▼
  Helius RPC ──────────► Position Aggregator
        │                        │
  Protocol SDKs ──────►  Portfolio State DB
  (Kamino, Jupiter,              │
   Drift, Orca...)               ▼
                          AI Insights Engine
                          (Claude API)
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
             Live Alerts             Backtesting Engine
             (24/7 monitoring)       (2yr historical data)
                    │                         │
                    └────────────┬────────────┘
                                 ▼
                          Wisp Dashboard
```

---

## Getting Started (Frontend Dev)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
/app
  layout.tsx          # Root layout, fonts, metadata
  page.tsx            # Main landing page composition
  globals.css         # Design tokens, utility classes, keyframes

/components
  Navbar.tsx          # Fixed nav with scroll-aware styling
  Hero.tsx            # Hero section with mascot + CTAs
  Features.tsx        # Four feature rows with interactive cards
  HowItWorks.tsx      # Four-step onboarding timeline
  PortfolioPreview.tsx # Dashboard mockup with chart + positions
  Protocols.tsx       # Protocol integration showcase + marquee
  CTA.tsx             # Waitlist email capture
  Footer.tsx          # Footer links
  WispMascot.tsx      # Animated SVG mascot (8 moods)
  SmoothScroll.tsx    # Lenis smooth scroll wrapper
  StarField.tsx       # Animated star background
  WaitlistSuccessModal.tsx  # Confetti success modal
  ui/Button.tsx       # Reusable button (4 variants)
```

---

## Design System

**Color palette:**

| Token             | Value       | Usage                    |
|-------------------|-------------|--------------------------|
| `--bg`            | `#080b14`   | Base background          |
| `--violet`        | `#8b5cf6`   | Primary accent           |
| `--violet-dk`     | `#5b21b6`   | Buttons, CTAs            |
| `--violet-lt`     | `#b4a8f0`   | Gradient text            |
| `--t1`            | `#ffffff`   | Primary text             |
| `--t2`            | `#a1a1aa`   | Secondary text           |
| `--green`         | `#22c55e`   | Positive / gains         |
| `--red`           | `#f87171`   | Negative / losses        |
| `--amber`         | `#f59e0b`   | Warnings                 |

**Utility classes:** `.glass`, `.glass-strong`, `.gradient-text`, `.gradient-text-purple`, `.grid-bg`

---

## Brand

**Name:** Wisp
**Tagline:** Your AI co-pilot for Solana DeFi
**Tone:** Playful, technically precise, empowering
**Safety emphasis:** Read-only. No signing permissions. Zero custody risk.

---

## License

MIT
