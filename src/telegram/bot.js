const TelegramBot = require("node-telegram-bot-api");
const { getTopWhales } = require("../database/db");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("polling_error", (err) => {
  console.log("Telegram polling error:", err.message);
});

async function sendAlert(message) {
  try {
    await bot.sendMessage(process.env.CHAT_ID, message, {
      parse_mode: "HTML"
    });
  } catch (err) {
    console.log("Telegram error:", err.message);
  }
}

bot.onText(/\/top/, async (msg) => {
  try {
    const data = await getTopWhales(10);

    let text = "🐋 <b>TOP WHALES</b>\n\n";

    if (!data.length) {
      text += "No data yet...";
    } else {
      data.forEach((w, i) => {
        text +=
`#${i + 1}
Wallet: <code>${w.wallet}</code>
Volume: <b>${Number(w.total_volume).toFixed(2)}</b>
Transfers: ${w.transfer_count}
Score: ${w.whale_score}

`;
      });
    }

    bot.sendMessage(msg.chat.id, text, { parse_mode: "HTML" });
  } catch (err) {
    console.log("top error:", err.message);
    bot.sendMessage(msg.chat.id, "Liderlik tablosu alınırken bir hata oluştu.");
  }
});

bot.onText(/\/wallet (.+)/, async (msg, match) => {
  const wallet = match[1];

  bot.sendMessage(
    msg.chat.id,
    `🔍 Wallet Tracker

${wallet}

(advanced analytics coming soon)`
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `Kullanılabilir komutlar:
/top - en yüksek hacimli whale cüzdanları
/wallet <adres> - belirli bir cüzdanı sorgula
/help - bu mesajı göster`
  );
});

module.exports = { sendAlert };
