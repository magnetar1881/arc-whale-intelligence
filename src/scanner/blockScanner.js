const { ethers } = require("ethers");
const { sendAlert } = require("../telegram/bot");
const {
  insertWhale,
  updateWallet,
  updateTokenStats,
} = require("../database/db");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

const TRANSFER_TOPIC =
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

const seenTx = new Set();

// 🔥 TESTNET SAFE THRESHOLD (ARTTIRILDI)
const MIN_AMOUNT = BigInt("5000000000000000000000000"); // 5M tokens

// token cache
const tokenCache = new Map();

function isZeroAddress(addr) {
  return addr === "0x0000000000000000000000000000000000000000";
}

async function startScanner() {
  console.log("🚀 Whale Engine V4 (Smart Filter) Started");

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
          if (seenTx.has(txHash)) continue;
          seenTx.add(txHash);

          const from = "0x" + log.topics[1].slice(26);
          const to = "0x" + log.topics[2].slice(26);

          const value = ethers.AbiCoder.defaultAbiCoder()
            .decode(["uint256"], log.data)[0];

          const type =
            isZeroAddress(from)
              ? "MINT"
              : isZeroAddress(to)
              ? "BURN"
              : "TRANSFER";

          // 🔥 MINT FILTER (spam engelle)
          if (type === "MINT" && value > MIN_AMOUNT * 10n) {
            // allow only huge mints
          } else if (type === "MINT") {
            continue;
          }

          if (BigInt(value) < MIN_AMOUNT) continue;

          // token cache
          let tokenData = tokenCache.get(log.address);

          if (!tokenData) {
            const token = new ethers.Contract(log.address, ERC20_ABI, provider);

            let symbol = "UNKNOWN";
            let decimals = 18;

            try {
              symbol = await token.symbol();
              decimals = await token.decimals();
            } catch {}

            tokenData = { symbol, decimals };
            tokenCache.set(log.address, tokenData);
          }

          const amount = ethers.formatUnits(value, tokenData.decimals);

          // wallet update
          await updateWallet(from, Number(amount));

          // token update
          await updateTokenStats(log.address, tokenData.symbol, type);

          // DB insert
          await insertWhale({
            txHash,
            wallet: from,
            token: tokenData.symbol,
            amount: Number(amount),
            type
          });

          // 🔥 FINAL FILTER (soft intelligence gate)
          if (type === "MINT") continue;

          const message =
`🐋 <b>V4 SMART WHALE</b>

Type: ${type}
Token: <b>${tokenData.symbol}</b>
Amount: <b>${amount}</b>

From:
<code>${from}</code>

Tx:
<code>${txHash}</code>`;

          console.log("🐋 WHALE:", tokenData.symbol, amount);

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
