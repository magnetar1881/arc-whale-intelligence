# Arc Whale Alert Bot

A lightweight on-chain monitoring system for detecting large ERC20 transfers and notable wallet activity on Arc testnet.

---

## Overview

Arc Whale Alert Bot listens to ERC20 Transfer events in real time and tracks wallet activity across the Arc network.

Because testnets often generate large amounts of faucet, mint, and other non-economic transactions, the system applies custom filtering rules to reduce noise and highlight potentially meaningful on-chain activity.

Detected events are stored locally and can optionally be forwarded to Telegram for real-time monitoring and analysis.

---

## Features

- Real-time ERC20 transfer monitoring
- Large transaction detection using a configurable, decimal-aware size threshold
- Mint, faucet, and burn filtering
- Per-token symbol/decimals caching (reduces RPC calls)
- Wallet activity tracking and scoring
- Token transfer indexing
- SQLite local database storage (WAL mode)
- Telegram alert integration with `/top`, `/wallet`, and `/help` commands
- Optional token whitelist to limit RPC load to specific contracts

---

## Tech Stack

- Node.js
- ethers.js
- SQLite
- Telegram Bot API
- Arc RPC

---

## How It Works

1. Connects to Arc RPC endpoint
2. Subscribes to ERC20 Transfer events
3. Filters common testnet noise (mint / faucet / spam)
4. Records wallet and token activity locally
5. Applies a configurable, decimal-aware size threshold to flag large transfers
6. Sends Telegram alerts for transfers above the threshold

---

## Project Goal

The goal of this project is to make Arc testnet activity more readable by filtering out low-value transactions and surfacing meaningful wallet movements that may indicate liquidity flows or smart activity.

This helps builders and researchers understand network behavior in real time.

---

## Installation

```bash
npm install
```

Create a `.env` file in the project root (see **Configuration** below), then run:

```bash
node src/app.js
```

Or, to keep it running persistently with pm2:

```bash
pm2 start src/app.js --name arc-whale
pm2 save
```

---

## Configuration

The bot is configured entirely through environment variables. Create a `.env` file in the project root:

RPC_URL=

BOT_TOKEN=

CHAT_ID=

WHALE_THRESHOLD=100000

LARGE_TRANSFER_THRESHOLD=250000

COOLDOWN_MS=5000

MEMORY_TTL_MS=600000

TOKEN_WHITELIST=

| Variable | Required | Description |
|---|---|---|
| `RPC_URL` | yes | Arc testnet JSON-RPC endpoint |
| `BOT_TOKEN` | yes | Telegram bot token from @BotFather |
| `CHAT_ID` | yes | Telegram chat/group ID to send alerts to |
| `WHALE_THRESHOLD` | no (default 100000) | Minimum decimal-adjusted token amount to trigger an alert |
| `LARGE_TRANSFER_THRESHOLD` | no (default 250000) | Amount above which an alert is labeled "LARGE" instead of "STANDARD" — a size-based label, not a real liquidity/TVL analysis |
| `COOLDOWN_MS` | no (default 5000) | Minimum time (ms) between processed transfers from the same wallet |
| `MEMORY_TTL_MS` | no (default 600000) | How often (ms) in-memory dedup/cooldown state is cleaned up |
| `TOKEN_WHITELIST` | no | Comma-separated token contract addresses to watch; leave empty to watch all |

---

## Telegram Commands

- `/top` — top wallets by tracked volume
- `/wallet <address>` — look up a wallet (basic info for now)
- `/help` — list available commands

---

## Planned Improvements (Roadmap)

- Web dashboard (real-time analytics)
- Historical on-chain analytics
- Smart money tracking
- Wallet reputation scoring system
- True liquidity-aware filtering (DEX pool reserves / TVL / slippage-based — distinct from the current size-based heuristic)
- Advanced alert types (anomaly detection)
