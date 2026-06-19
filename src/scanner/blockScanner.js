const {
  insertWhale,
  updateWallet,
  updateWalletScore,
  updateTokenStats
} = require("../database/db");

const { ethers } = require("ethers");
const { sendAlert } = require("../telegram/bot");

// ========================
// CONFIG (.env üzerinden ayarlanabilir, makul varsayılanlarla)
// ========================
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Whale uyarı eşiği — decimal'e göre düzeltilmiş (insan-okunabilir) birim
const WHALE_THRESHOLD = Number(process.env.WHALE_THRESHOLD || 100000);

// Sadece etiketleme/bilgi amaçlı bir boyut eşiği.
// NOT: bu gerçek bir "liquidity" analizi DEĞİL (DEX pool/TVL/slippage okumuyor),
// sadece transfer miktarına bakan basit bir heuristic — isim ona göre verildi.
const LARGE_TRANSFER_THRESHOLD = Number(process.env.LARGE_TRANSFER_THRESHOLD || 250000);

// Aynı cüzdandan ardışık işlemler arası bekleme süresi (ms)
const COOLDOWN_MS = Number(process.env.COOLDOWN_MS || 5000);

// seenTx / walletCooldown bellek temizlik aralığı (ms) — memory leak önlemi
const MEMORY_TTL_MS = Number(process.env.MEMORY_TTL_MS || 10 * 60 * 1000); // 10 dk

// Opsiyonel: virgülle ayrılmış token kontrat adresleri.
// Boş bırakılırsa zincirdeki TÜM ERC20 Transfer eventleri dinlenir (RPC yükü artar).
const TOKEN_WHITELIST = (process.env.TOKEN_WHITELIST || "")
  .split(",")
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// ERC20 Transfer event topic: Transfer(address,address,uint256)
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

// ========================
// BELLEKTE TUTULAN STATE (TTL ile temizleniyor)
// ========================
const seenTx = new Map();          // txHash -> timestamp
const walletCooldown = new Map();  // wallet -> timestamp
const tokenInfoCache = new Map();  // tokenAddress -> { symbol, decimals }

setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of seenTx) {
    if (now - ts > MEMORY_TTL_MS) seenTx.delete(key);
  }
  for (const [key, ts] of walletCooldown) {
    if (now - ts > MEMORY_TTL_MS) walletCooldown.delete(key);
  }
}, MEMORY_TTL_MS);

// ========================
// TOKEN BİLGİSİ (cache'li — her transfer'de RPC'ye gitmesin)
// ========================
async function getTokenInfo(tokenAddress) {
  const key = tokenAddress.toLowerCase();
  if (tokenInfoCache.has(key)) return tokenInfoCache.get(key);

  let symbol = "UNKNOWN";
  let decimals = 18;

  try {
    const contract = new ethers.Contract(
      tokenAddress,
      [
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)"
      ],
      provider
    );
    symbol = await contract.symbol();
    decimals = await contract.decimals();
  } catch {
    // symbol()/decimals() implement etmeyen kontratlar için varsayılanlar kalır
  }

  const info = { symbol, decimals };
  tokenInfoCache.set(key, info);
  return info;
}

// ========================
// MAIN SCANNER
// ========================
async function startScanner() {
  console.log("🚀 Whale Engine V6 (size-based heuristic filter) started");

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

          // Whitelist varsa, istenmeyen tokenlar için RPC/DB işine hiç girme
          if (
            TOKEN_WHITELIST.length &&
            !TOKEN_WHITELIST.includes(log.address.toLowerCase())
          ) {
            continue;
          }

          const txHash = log.transactionHash;

          // ========================
          // DUPLICATE PROTECTION
          // ========================
          if (seenTx.has(txHash)) continue;
          seenTx.set(txHash, Date.now());

          // ========================
          // DECODE ADDRESSES
          // ========================
          const from = "0x" + log.topics[1].slice(26);
          const to = "0x" + log.topics[2].slice(26);

          // ========================
          // COOLDOWN
          // ========================
          const lastSeen = walletCooldown.get(from);
          const now = Date.now();
          if (lastSeen && now - lastSeen < COOLDOWN_MS) continue;
          walletCooldown.set(from, now);

          // ========================
          // VALUE DECODE (ham, atomic birim)
          // ========================
          const value = ethers.AbiCoder.defaultAbiCoder().decode(
            ["uint256"],
            log.data
          )[0];

          const isMint = from.toLowerCase() === ZERO_ADDRESS;
          const isBurn = to.toLowerCase() === ZERO_ADDRESS;

          // ========================
          // TOKEN BİLGİSİ (cache'li)
          // ========================
          const token = log.address;
          const { symbol, decimals } = await getTokenInfo(token);

          // Decimal'e göre düzeltilmiş, insan-okunabilir miktar.
          // Aşağıdaki TÜM eşik kontrolleri bu değeri kullanır, ham `value`'yu DEĞİL.
          const amount = Number(ethers.formatUnits(value, decimals));

          // ========================
          // CÜZDAN / TOKEN TAKİBİ (eşik altında olsa da hep kaydedilir)
          // ========================
          await updateWallet(from, amount);
          await updateWalletScore(from);
          await updateTokenStats(token, symbol, isMint ? "MINT" : isBurn ? "BURN" : "TRANSFER");

          // ========================
          // SPAM / NOISE FİLTRESİ
          // ========================
          if (isMint || isBurn) continue;
          if (amount < WHALE_THRESHOLD) continue;

          // ========================
          // KAYDET + ALARM
          // ========================
          // Sadece miktar bazlı bir etiket (size-based heuristic),
          // gerçek bir DEX likidite/slippage analizi DEĞİL.
          const sizeTier = amount >= LARGE_TRANSFER_THRESHOLD ? "LARGE" : "STANDARD";

          await insertWhale({
            txHash,
            wallet: from,
            token: symbol,
            amount,
            type: "WHALE"
          });

          const message = `
🐋 <b>WHALE ALERT</b> (${sizeTier})

Token: ${symbol}
Amount: ${amount.toLocaleString()}

From:
${from}

To:
${to}

Tx:
${txHash}
          `;

          console.log("🐋 WHALE:", symbol, amount);
          await sendAlert(message, token);

        } catch (e) {
          console.log("log skip:", e.message);
        }
      }
    } catch (e) {
      console.log("block error:", e.message);
    }
  });

  provider.on("error", (err) => {
    console.log("⚠️ Provider error:", err.message);
  });
}

module.exports = { startScanner };
