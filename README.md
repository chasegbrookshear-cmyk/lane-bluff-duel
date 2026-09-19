# Lane Bluff Duel (spike)

Static web spike for Ship Lab.

## Run locally
```bash
cd lane-bluff-duel && python3 -m http.server 8766
```
Open http://127.0.0.1:8766

## Play
1. Vs dumb AI or Hotseat
2. Pick card → tap lane → Face-up or Face-down
3. Place 3 cards each → win 2 of 3 lanes → Rematch

## Session-start counters (Growth)
Fires once per page load on first human card place (`session_start`), plus mode pick (`mode_ai` / `mode_hotseat`).

Read:
- https://abacus.jasoncameron.dev/get/ship-lab-lbd/session_start
- https://abacus.jasoncameron.dev/get/ship-lab-lbd/mode_ai
- https://abacus.jasoncameron.dev/get/ship-lab-lbd/mode_hotseat
