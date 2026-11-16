# token-radar-01-entry

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zhangzzz1878/token-radar-01-entry/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zhangzzz1878/token-radar-01-entry/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar that ranks pre-token DeFi protocols by implied airdrop value and shows how to farm each one. It reads a sealed DefiLlama snapshot (758 protocols), scores every pre-token protocol with a calibrated value model (category mcap/TVL multiples, log-damped growth, maturity curve, multi-chain width), and writes a ranked board of 198 protocols — all 40 watchlist protocols covered — plus a sortable, filterable dashboard with a detail view, farm plan, and model breakdown for each protocol.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Requires Node.js 22.18 or later, standard library only. The program writes `board.json`, `data.js`, the `dashboard/` and `screenshots/` copies, and `dossier.json` into the output directory.

---

<sub>Entered on [make.fun](https://make.fun/?ref=4mdg389a&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
