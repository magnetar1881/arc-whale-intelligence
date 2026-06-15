const TelegramBot = require("node-telegram-bot-api");
const { getTopWhales } = require("../database/db");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

async function sendAlert(message) {
  try {
    await bot.sendMessage(process.env.CHAT_ID, message, {
      parse_mode: "HTML"
    });
  } catch (err) {
    console.log("Telegram error:", err.message);
  }
}

// ======================
// /top whales (V3)
// ======================
bot.onText(/\/top/, async (msg) => {
  try {
    const data = await getTopWhales(10);

    let text = "🐋 <b>TOP WHALES V3</b>\n\n";

    if (!data.length) {
      text += "No data yet...";
    }

    data.forEach((w, i) => {
      text +=
`#${i + 1}
Wallet: <code>${w.wallet}</code>
Volume: <b>${w.total_volume}</b>
Transfers: ${w.transfer_count}

`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });

  } catch (err) {
    console.log("top error:", err.message);
  }
});

// ======================
// /wallet
// ======================
bot.onText(/\/wallet (.+)/, async (msg, match) => {
  const wallet = match[1];

  bot.sendMessage(
    msg.chat.id,
    `🔍 Wallet Tracker

${wallet}

(advanced analytics coming soon)`
  );
});

// ======================
// /top
// ======================
bot.onText(/\/top/, async (msg) => {
  const data = await getTopWhales(10);

  let text = "🐋 TOP WALLETS V6\n\n";

  data.forEach((w, i) => {
    text += `#${i + 1}\n`;
    text += `Wallet: ${w.wallet}\n`;
    text += `Volume: ${Number(w.total_volume).toFixed(2)}\n`;
    text += `Score: ${w.whale_score}\n\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

module.exports = { sendAlert };
