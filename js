const { default: makeWASocket, useMultiFileAuthState } = require("baileys");
const pino = require("pino");
const readline = require("readline");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "info" }),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    console.log("🔄 Connection:", connection || "starting");

    if (connection === "open") {
      console.log("✅ Luttuxer MD CONNECTED!");
    }

    if (connection === "close") {
      console.log("❌ Connection closed");
      console.log("Error:", lastDisconnect?.error);
    }
  });

  if (!state.creds.registered) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(
      "📱 WhatsApp number with country code (no +): ",
      async (number) => {
        try {
          const code = await sock.requestPairingCode(number.trim());
          console.log("🔗 PAIRING CODE:", code);
        } catch (err) {
          console.log("❌ Pairing failed:", err);
        }
        rl.close();
      }
    );
  }
}

startBot();
