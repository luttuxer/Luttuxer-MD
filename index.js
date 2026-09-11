const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  downloadContentFromMessage
} = require("baileys");

const pino = require("pino");
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { execFile } = require("child_process");
const WebP = require("node-webpmux");

const OWNER =
  "⏱‹‹ 𝞘𝞵𝞽⃕͜𝞽𝞴𝞺⃕𝞺𝞲 𝞭𝞮⃕͜𝟆 ↲ 🈀🥕";

const OWNER_NUMBER =
  "917907914657";

const ALIVE =
  "_I am alive! (use .setalive help for custom alive msg)_";
const aliveStore = new Map();

function getAlive(jid) {
  return aliveStore.get(jid) || ALIVE;
}
const STICKER_PACK =
  "";

const STICKER_AUTHOR =
  "𝐋𝛖𝛕𝛕𝛂𝛒𝛊／🌷💭⭒;-`𝛒𝜶֟፝ꪜ𝘐𝘐𝘐ː𓆪/🐼🤍";

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffmpeg",
      args,
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              stderr || error.message
            )
          );
        } else {
          resolve(stdout);
        }
      }
    );
  });
}

async function addStickerMetadata(
  webpBuffer,
  packname,
  author
) {
  const img = new WebP.Image();

  const stickerPackId =
    crypto.randomBytes(16).toString("hex");

  const json = {
    "sticker-pack-id": stickerPackId,
    "sticker-pack-name": packname,
    "sticker-pack-publisher": author,
    emojis: [""]
  };

  const jsonBuffer =
    Buffer.from(
      JSON.stringify(json),
      "utf8"
    );

  const exifAttr =
    Buffer.from([
      0x49, 0x49, 0x2a, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00,
      0x41, 0x57, 0x07, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x16, 0x00, 0x00, 0x00
    ]);

  const exif =
    Buffer.concat([
      exifAttr,
      jsonBuffer
    ]);

  exif.writeUIntLE(
    jsonBuffer.length,
    14,
    4
  );

  await img.load(webpBuffer);

  img.exif = exif;

  return await img.save(null);
}

async function startBot() {
  const {
    state,
    saveCreds
  } = await useMultiFileAuthState(
    "./auth_info"
  );

  const sock =
    makeWASocket({
      auth: state,
      logger: pino({
        level: "silent"
      }),
      printQRInTerminal: false
    });

  sock.ev.on(
    "creds.update",
    saveCreds
  );

  sock.ev.on(
    "connection.update",
    async (update) => {
      const {
        connection,
        lastDisconnect
      } = update;

      console.log(
        "Connection:",
        connection
      );

      if (connection === "open") {
        console.log(
          "✅ Luttuxer MD CONNECTED! 🤖🫶🏻"
        );
      }

      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error?.output
            ?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          console.log(
            "🔄 Reconnecting..."
          );

          startBot();
        } else {
          console.log(
            "❌ Logged out."
          );
        }
      }
    }
  );

  sock.ev.on(
    "messages.upsert",
    async ({ messages }) => {
      try {
        const msg =
          messages[0];

        if (
          !msg ||
          !msg.message
        ) {
          return;
        }

        const jid =
          msg.key.remoteJid;

        if (!jid) {
          return;
        }

        const message =
          msg.message;

        const text =
          message.conversation ||
          message.extendedTextMessage?.text ||
          message.imageMessage?.caption ||
          message.videoMessage?.caption ||
          "";

        const command =
          text
            .trim()
            .toLowerCase()
            .replace(
              /^\.\s+/,
              "."
            );

        console.log(
          "📩 Message:",
          text
        );

        // =====================================
        // AUTO GROUP MENTION VOICE
        // =====================================

      if (
  jid.endsWith("@g.us") &&
  message.extendedTextMessage
) {
  const mentionedJid =
    message.extendedTextMessage?.contextInfo?.mentionedJid || [];

  if (mentionedJid.length > 0) {
    const localAudio = path.join(
      process.cwd(),
      "mention.ogg"
    );

    if (!fs.existsSync(localAudio)) {
      console.log("❌ mention.ogg not found");
      return;
    }

    try {
      const audioBuffer = fs.readFileSync(localAudio);

      const thumbnailUrl =
        "https://i.ibb.co/Wv2qtrDC/temp.jpg";

      const instagramUrl =
        "https://www.instagram.com/who.__iam_._?stkn=Nm53cGJ2cHI2bjNu";

      const response = await fetch(thumbnailUrl);
      const thumbnailBuffer = Buffer.from(
        await response.arrayBuffer()
      );

      await sock.sendMessage(
        jid,
        {
          audio: audioBuffer,
          mimetype: "audio/ogg; codecs=opus",
          ptt: true,

          contextInfo: {
            mentionedJid: mentionedJid,

            externalAdReply: {
              title:
                "ᴡʜʏ ᴅɪᴅ ʏᴏᴜ ᴍᴇɴᴛɪᴏɴ ᴍᴇ???",

              body:
                "-` 𝐋𝛖𝛕𝛕𝛂𝛒𝛊／🌷🤍",

              mediaType: 2,

              thumbnail: thumbnailBuffer,

              mediaUrl: instagramUrl,

              sourceUrl: instagramUrl,

              showAdAttribution: true
            }
          }
        },
        {
          quoted: msg
        }
      );

      console.log("✅ Mention voice + Instagram card sent!");

    } catch (error) {
      console.error(
        "❌ Mention voice/card error:",
        error
      );
    }

    return;
  }
}

        // =====================================
        // PING
        // =====================================

     if (command === ".ping") {
  const start = Date.now();

  await sock.sendMessage(
    jid,
    {
      text: "🏓 Pinging..."
    }
  );

  const latency = Date.now() - start;

  await sock.sendMessage(
    jid,
    {
      text: `*☇ ꜱᴩᷨᴇͦᴇͭᴅ 🐼 :* ${latency.toFixed(2)} *ᴍꜱ*`
    },
    { quoted: msg }
  );

  return;
}

// =====================================
// TAGALL
// =====================================

if (command === ".tagall") {
  if (!jid.endsWith("@g.us")) {
    await sock.sendMessage(
      jid,
      { text: "❌ This command is only for groups." },
      { quoted: msg }
    );
    return;
  }

  const groupMetadata = await sock.groupMetadata(jid);
  const participants = groupMetadata.participants;

  let mentions = [];
  let tagText = "╭━━━〔 ᴛᴀɢᴀʟʟ 〕━━━╮\n┃\n";

  for (const member of participants) {
    mentions.push(member.id);
    tagText += `┃ 🐼 @${member.id.split("@")[0]}\n`;
  }

  tagText += "┃\n╰━━━━━━━━━━━━━━━━╯";

  await sock.sendMessage(
    jid,
    {
      text: tagText,
      mentions: mentions
    },
    { quoted: msg }
  );

  return;
}

 // =====================================
// ALIVE
// =====================================

if (command === ".alive") {
  await sock.sendMessage(
    jid,
    {
      text: getAlive(jid)
    },
    {
      quoted: msg
    }
  );

  return;
}

// =====================================
// SETALIVE
// =====================================

if (command === ".setalive help") {
  await sock.sendMessage(
    jid,
    {
      text:
        "╭━━━〔 SETALIVE 〕━━━╮\n" +
        "┃\n" +
        "┃ ✦ .setalive <message>\n" +
        "┃ ✦ .setalive reset\n" +
        "┃\n" +
        "╰━━━━━━━━━━━━━━━━━━╯"
    },
    {
      quoted: msg
    }
  );

  return;
}

if (command.startsWith(".setalive ")) {
  const newAlive = text.trim().slice(9).trim();

  if (!newAlive) {
    await sock.sendMessage(
      jid,
      {
        text: "❌ Please enter an alive message."
      },
      {
        quoted: msg
      }
    );
    return;
  }

  if (newAlive.toLowerCase() === "reset") {
    aliveStore.delete(jid);

    await sock.sendMessage(
      jid,
      {
        text: "✅ Alive message reset!"
      },
      {
        quoted: msg
      }
    );

    return;
  }

  aliveStore.set(jid, newAlive);

  await sock.sendMessage(
    jid,
    {
      text: "✅ Alive message updated!"
    },
    {
      quoted: msg
    }
  );

  return;
}

       // =====================================
// MENU
// =====================================

if (command === ".menu") {
  const menu =
`╭═══〘 𝙇𝙪𝙩𝙩𝙪𝙭𝙚𝙧 𝙈𝘿 〙═══⊷❍
┃
┃ 👑 .owner
┃ ❤️ .alive
┃ 🏓 .ping
┃ 🏷️ .tagall
┃ 🖼️ .sticker
┃ 🖼️ .photo
┃ 👁️ .vv
┃ 📜 .menu
┃
╰══════════════════❍`;

  await sock.sendMessage(
    jid,
    {
      text: menu
    },
    {
      quoted: msg
    }
  );

  return;
}

        // =====================================
        // VV
        // =====================================

        if (
          command === ".vv"
        ) {
          const quotedMessage =
            message
              ?.extendedTextMessage
              ?.contextInfo
              ?.quotedMessage;

          if (!quotedMessage) {
            await sock.sendMessage(
              jid,
              {
                text:
                  "👁️ View-once photo/video reply cheythu `.vv` adikkuka."
              },
              {
                quoted: msg
              }
            );

            return;
          }

          const media =
            quotedMessage.imageMessage ||
            quotedMessage.videoMessage;

          if (!media) {
            await sock.sendMessage(
              jid,
              {
                text:
                  "❌ Photo/video message reply cheyyuka."
              },
              {
                quoted: msg
              }
            );

            return;
          }

          try {
            const type =
              quotedMessage.imageMessage
                ? "image"
                : "video";

            console.log(
              "👁️ Downloading view-once media..."
            );

            const stream =
              await downloadContentFromMessage(
                media,
                type
              );

            const chunks = [];

            for await (
              const chunk of stream
            ) {
              chunks.push(chunk);
            }

            const buffer =
              Buffer.concat(
                chunks
              );

            if (
              type === "image"
            ) {
              await sock.sendMessage(
                jid,
                {
                  image: buffer,
                  caption:
                    "👁️ View Once"
                },
                {
                  quoted: msg
                }
              );
            } else {
              await sock.sendMessage(
                jid,
                {
                  video: buffer,
                  caption:
                    "👁️ View Once"
                },
                {
                  quoted: msg
                }
              );
            }

            console.log(
              "✅ VV media sent!"
            );

          } catch (error) {
            console.error(
              "❌ VV Error:",
              error
            );

            await sock.sendMessage(
              jid,
              {
                text:
                  "❌ View-once media process cheyyan pattiyilla."
              },
              {
                quoted: msg
              }
            );
          }

          return;
        }

        // =====================================
        // OWNER
        // =====================================

        if (
          command === ".owner"
        ) {
          const ownerImage =
            path.join(
              process.cwd(),
              "owner.jpg"
            );

          if (
            fs.existsSync(
              ownerImage
            )
          ) {
            await sock.sendMessage(
              jid,
              {
                image:
                  fs.readFileSync(
                    ownerImage
                  ),
                caption:
                  `👑 ${OWNER}\n\n📱 wa.me/${OWNER_NUMBER}`
              },
              {
                quoted: msg
              }
            );
          } else {
            await sock.sendMessage(
              jid,
              {
                text:
                  `👑 Owner: ${OWNER}\n📱 wa.me/${OWNER_NUMBER}`
              },
              {
                quoted: msg
              }
            );
          }

          return;
        }

        // =====================================
        // STICKER
        // =====================================

        if (
          command === ".sticker" ||
          command === ".s"
        ) {
          const quotedMessage =
            message
              ?.extendedTextMessage
              ?.contextInfo
              ?.quotedMessage;

          const imageMessage =
            quotedMessage?.imageMessage;

          if (!imageMessage) {
            await sock.sendMessage(
              jid,
              {
                text:
                  "🖼️ Image reply cheythu `.sticker` adikkuka."
              },
              {
                quoted: msg
              }
            );

            return;
          }

          try {
            console.log(
              "🖼️ Downloading quoted image..."
            );

            const media =
              await downloadMediaMessage(
                {
                  key: msg.key,
                  message: {
                    imageMessage:
                      imageMessage
                  }
                },
                "buffer",
                {}
              );

            const inputFile =
              path.join(
                os.tmpdir(),
                `sticker_${Date.now()}.jpg`
              );

            const outputFile =
              path.join(
                os.tmpdir(),
                `sticker_${Date.now()}.webp`
              );

            fs.writeFileSync(
              inputFile,
              media
            );

            await runFFmpeg([
              "-y",
              "-i",
              inputFile,
              "-vf",
              "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black",
              "-c:v",
              "libwebp",
              "-q:v",
              "80",
              "-pix_fmt",
              "yuva420p",
              "-frames:v",
              "1",
              outputFile
            ]);

            let stickerBuffer =
              fs.readFileSync(
                outputFile
              );

            stickerBuffer =
              await addStickerMetadata(
                stickerBuffer,
                STICKER_PACK,
                STICKER_AUTHOR
              );

            await sock.sendMessage(
              jid,
              {
                sticker:
                  stickerBuffer
              },
              {
                quoted: msg
              }
            );

            fs.unlinkSync(
              inputFile
            );

            fs.unlinkSync(
              outputFile
            );

            console.log(
              "✅ Sticker sent!"
            );

          } catch (error) {
            console.error(
              "❌ Sticker error:",
              error
            );

            await sock.sendMessage(
              jid,
              {
                text:
                  "❌ Sticker undakkan pattiyilla."
              },
              {
                quoted: msg
              }
            );
          }

          return;
        }

        // =====================================
        // PHOTO / TOIMG
        // =====================================

        if (
          command === ".photo" ||
          command === ".toimg"
        ) {
          const stickerMessage =
            message.stickerMessage;

          if (!stickerMessage) {
            await sock.sendMessage(
              jid,
              {
                text:
                  "🖼️ Sticker reply cheythu `.photo` adikkuka."
              },
              {
                quoted: msg
              }
            );

            return;
          }

          try {
            console.log(
              "🖼️ Downloading sticker..."
            );

            const media =
              await downloadMediaMessage(
                msg,
                "buffer",
                {}
              );

            const inputFile =
              path.join(
                os.tmpdir(),
                `photo_${Date.now()}.webp`
              );

            const outputFile =
              path.join(
                os.tmpdir(),
                `photo_${Date.now()}.jpg`
              );

            fs.writeFileSync(
              inputFile,
              media
            );

            await runFFmpeg([
              "-y",
              "-i",
              inputFile,
              "-q:v",
              "2",
              outputFile
            ]);

            await sock.sendMessage(
              jid,
              {
                image:
                  fs.readFileSync(
                    outputFile
                  )
              },
              {
                quoted: msg
              }
            );

            fs.unlinkSync(
              inputFile
            );

            fs.unlinkSync(
              outputFile
            );

            console.log(
              "✅ Photo sent!"
            );

          } catch (error) {
            console.error(
              "❌ Photo error:",
              error
            );

            await sock.sendMessage(
              jid,
              {
                text:
                  "❌ Sticker photo aakkan pattiyilla."
              },
              {
                quoted: msg
              }
            );
          }

          return;
        }

      } catch (err) {
        console.log(
          "❌ Message error:",
          err.message
        );
      }
    }
  );
}

startBot();
