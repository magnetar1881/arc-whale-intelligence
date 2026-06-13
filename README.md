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
- Large transaction detection (whale activity)
- Mint, faucet, and burn filtering
- Wallet activity tracking
- Token transfer indexing
- SQLite local database storage
- Telegram alert integration
- Whale leaderboard (`/top` command)

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
5. Applies threshold-based whale detection logic
6. Sends Telegram alerts for high-confidence events

---

## Project Goal

The goal of this project is to make Arc testnet activity more readable by filtering out low-value transactions and surfacing meaningful wallet movements that may indicate liquidity flows or smart activity.

This helps builders and researchers understand network behavior in real time.

---

## Planned Improvements (Roadmap)

- Web dashboard (real-time analytics)
- Historical on-chain analytics
- Smart money tracking
- Wallet reputation scoring system
- Liquidity-aware filtering layer
- Advanced alert types (anomaly detection)

---

## Installation

```bash
npm install
node src/app.js
