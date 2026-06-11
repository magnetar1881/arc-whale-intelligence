# Arc Whale Alert Bot

A lightweight monitoring tool for detecting large ERC20 transfers and notable wallet activity on Arc testnet.

---

## Overview

Arc Whale Alert Bot listens to ERC20 Transfer events in real time and tracks wallet activity across the network.

Because testnets often generate large amounts of faucet, mint, and other non-economic transactions, the bot applies custom filtering rules to reduce noise and highlight potentially meaningful activity.

Detected events are stored locally and can be forwarded to Telegram for monitoring and analysis.

---

## Features

* Real-time ERC20 transfer monitoring
* Large transaction detection
* Faucet, mint, and burn filtering
* Wallet activity tracking
* Token transfer indexing
* SQLite local database
* Telegram alert integration
* Whale leaderboard command (`/top`)

---

## Tech Stack

* Node.js
* ethers.js
* SQLite
* Telegram Bot API
* Arc RPC

---

## How It Works

1. Connects to the Arc RPC endpoint
2. Monitors ERC20 Transfer events
3. Filters common testnet noise
4. Records wallet and token activity
5. Detects unusually large transfers
6. Sends Telegram alerts when conditions are met

---

## Project Goal

The purpose of this project is to make Arc testnet activity easier to monitor by filtering out low-value transactions and surfacing wallet movements that may be worth investigating.

---

## Planned Improvements

* Web dashboard
* Historical analytics
* Smart money tracking
* Wallet reputation scoring
* Liquidity-aware filtering
* Additional alert types

---

## Installation

```bash
npm install
node src/app.js
```

## License

MIT
