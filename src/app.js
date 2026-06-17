require("dotenv").config();

const REQUIRED_ENV_VARS = ["RPC_URL", "BOT_TOKEN", "CHAT_ID"];
const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(`❌ Eksik environment değişkenleri: ${missing.join(", ")}`);
  console.error("Başlatmadan önce bir .env dosyası oluştur.");
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

const { startScanner } = require("./scanner/blockScanner");

startScanner();

console.log("✅ Arc Whale Alert Bot çalışıyor.");
