const {
  insertWhale,
  updateWallet,
  updateWalletScore,
  updateTokenStats
} = require("../database/db");

const { ethers } = require("ethers");
const { sendAlert } = require("../telegram/bot");

const walletCooldown = new Map();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// ========================
// CONFIG
// ========================
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// minimum whale threshold (adjust for testnet noise)
const MIN_AMOUNT = BigInt("10000000000000000000000"); // 10k tokens (18 decimals)

// spam protection memory
const seenTx = new Set();

// ERC20 Transfer event
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// ========================
// MAIN SCANNER
// ========================
async function startScanner() {
  console.log("🚀 Whale Engine V5 (Intelligence Filter) Started");

  provider.on("block", async (blockNumber) => {
    try {
      const logs = await provider.getLogs({
        fromBlock: blockNumber,
        toBlock: blockNumber,
        topics: [TRANSFER_TOPIC]
      });

      for (const log of logs) {
        try {
          if (!log?.data || log.data === "0x") continue;

          const txHash = log.transactionHash;
    	  // ========================
    	  // DUPLICATE PROTECTION (FIRST)
    	  // ========================
    	  if (seenTx.has(txHash)) continue;
    	  seenTx.add(txHash);

    	  // ========================
    	  // DECODE ADDRESSES
    	  // ========================
    	  const from = "0x" + log.topics[1].slice(26);
    	  const to = "0x" + log.topics[2].slice(26);

    	  // ========================
    	  // COOLDOWN (AFTER FROM READY)
    	  // ========================
    	  const lastSeen = walletCooldown.get(from);
    	  const now = Date.now();

    	  if (lastSeen && now - lastSeen < 5000) continue;

    	  walletCooldown.set(from, now);

    	  // ========================
    	  // VALUE DECODE
    	  // ========================
    	  const value = ethers.AbiCoder.defaultAbiCoder().decode(
      	    ["uint256"],
      	    log.data
    	  )[0];

          // ========================
          // ZERO ADDRESS FILTER
          // ========================
          const isMint = from.toLowerCase() === ZERO_ADDRESS;
          const isBurn = to.toLowerCase() === ZERO_ADDRESS;

          // ========================
          // TOKEN INTELLIGENCE UPDATE
          // ========================
          const token = log.address;

          let symbol = "UNKNOWN";
          let decimals = 18;

          try {
            const contract = new ethers.Contract(
              token,
              ["function symbol() view returns (string)", "function decimals() view returns (uint8)"],
              provider
            );

            symbol = await contract.symbol();
            decimals = await contract.decimals();
          } catch {}

          const amount = Number(ethers.formatUnits(value, decimals));

          // ========================
          // WALLET TRACKING (always)
          // ========================
          await updateWallet(from, amount);
          await updateWalletScore(from);

          // ========================
          // TOKEN STATS (always)
          // ========================
          await updateTokenStats(token, symbol, isMint ? "MINT" : isBurn ? "BURN" : "TRANSFER");

          // ========================
          // SPAM / LIQUIDITY FILTER
          // ========================

          // ignore dust + fake mint noise for whale alerts
          if (isMint || isBurn) continue;
          if (value < MIN_AMOUNT) continue;

          // ========================
          // BASIC LIQUIDITY SIGNAL
          // ========================
          const liquidityScore = amount > 100000 ? 1 : 0;

          // ========================
          // WHALE DECISION ENGINE
          // ========================
          const isWhale =
            amount > 50000 &&
            liquidityScore === 1;

          if (!isWhale) continue;

          // ========================
          // SAVE WHALE
          // ========================
          await insertWhale({
            txHash,
            wallet: from,
            token: symbol,
            amount,
            type: "WHALE"
          });

          // ========================
          // ALERT
          // ========================
          const message = `
🐋 <b>WHALE ALERT V5</b>

Token: ${symbol}
Amount: ${amount}

From:
${from}

To:
${to}

Tx:
${txHash}
          `;

          console.log("🐋 WHALE:", symbol, amount);

          await sendAlert(message);

        } catch (e) {
          console.log("log skip:", e.message);
        }
      }
    } catch (e) {
      console.log("block error:", e.message);
    }
  });
}

module.exports = { startScanner };
