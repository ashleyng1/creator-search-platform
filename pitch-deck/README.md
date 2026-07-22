# Tasweeq — VC Pitch Deck Package

Everything needed to pitch **Tasweeq (تسويق)** — the MENA-first influencer platform to
**Search** creators, **Manage** campaigns, and **Compare** competitor influencer strategy —
to top VCs.

## Contents

| File | What it is | Use it to… |
|---|---|---|
| [`01-vc-pitch-deck-playbook.md`](./01-vc-pitch-deck-playbook.md) | The 2026 VC pitch-deck rubric: structure, the 11–12 slides, per-slide "proof signal," DocSend attention data, and a pre-send checklist. | Know what a good deck must contain and hit the bar. |
| [`02-competitor-and-market-research.md`](./02-competitor-and-market-research.md) | Deep competitor + market research: global players (Modash, CreatorIQ, HypeAuditor, GRIN, Upfluence…), the "Compare"/benchmarking tools, MENA-native players (Lucidya, ArabyAds, MoonTech, Hypeo), market sizing (TAM/SAM/SOM), funding, and the feature matrix. | Defend every number and positioning claim. |
| [`03-tasweeq-pitch-deck.md`](./03-tasweeq-pitch-deck.md) | The actual deck **content**, slide by slide, written to the playbook, with `[FILL]` tags for founder-only numbers. | Draft/finalize the narrative. |
| [`index.html`](./index.html) | A **presentation-ready** reveal.js deck (12 slides, branded). | Present live or export to PDF. |

## How to present the deck

```bash
# from the pitch-deck/ folder — any static server works
python3 -m http.server 8080
# then open http://localhost:8080  (or just double-click index.html)
```

- Navigate with arrow keys · `F` = fullscreen · `S` = speaker notes · `Esc` = slide overview.
- **Export to PDF:** open `http://localhost:8080/?print-pdf` in Chrome → Print → Save as PDF.
- Requires internet (reveal.js + fonts load from CDN).

## Before you send it — do this
1. Replace **every `[FILL]`** in `index.html` and `03-tasweeq-pitch-deck.md` with real,
   defensible numbers (traction, team bios, financials, the ask).
2. Re-verify every market/funding stat against the source and print year — market-sizing
   figures differ by firm; cite the source on each slide (footnotes are already in place).
3. Run the pre-send checklist in `01-vc-pitch-deck-playbook.md`.

## The one-liner
> Global tools aren't MENA-native; MENA players are single-pillar or listening-only.
> **Tasweeq is the only Arabic-first product that unifies Search + Manage + Compare** — with a
> Mawthooq-compliance moat and a competitor-benchmark data flywheel — timed to Vision 2030,
> Expo 2030, and World Cup 2034.

> ⚠️ Research figures are compiled from public reports (Statista, Mordor Intelligence,
> Influencer Marketing Hub, PS Market Research/GII, Kolsquare, Tracxn, Arab News, GAMR/
> Mawthooq coverage) and are directionally correct — verify before printing.
