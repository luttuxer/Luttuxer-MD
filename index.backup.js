const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadContentFromMessage
} = require('baileys')

const pino = require('pino')
const readline = require('readline')
const fs = require('fs')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = (q) =>
  new Promise(resolve => rl.question(q, resolve))

let aliveMessage =
  '_I am alive! (use .setalive help for custom alive msg)_'

let alivePic = ''

async function downloadMedia(message, type) {
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

async function stickerToImage(buffer) {
  const input = '/tmp/luttuxer-sticker.webp'
  const output = '/tmp/luttuxer-image.png'

  fs.writeFileSync(input, buffer)

  await execFileAsync('convert', [
    input,
    output
  ])

  return fs.readFileSync(output)
}

async function startBot() {
  const { state, saveCreds } =
    await useMultiFileAuthState('./auth_info')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', (update) => {
    const { connection } = update

    if (connection === 'open') {
      console.log('✅ WhatsApp connection opened!')
    }

    if (connection === 'close') {
      console.log('❌ Connection closed')
    }
  })
if (!state.creds.registered) {
    const number = await question(
      '📱 Enter WhatsApp number with country code (no +): '
    )

    const code =
    await new Promise(resolve => setTimeout(resolve, 3000))
      await sock.requestPairingCode(number.trim())

    console.log('\n🔗 YOUR PAIRING CODE:')
    console.log(code)
    console.log('\nWhatsApp → Linked Devices → Link a Device → Link with phone number\n')
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'open') {
      console.log('✅ 𝙇𝙪𝙩𝙩𝙪𝙭𝙚𝙧 𝙈𝘿 CONNECTED! 🤖')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut

      console.log('❌ Connection closed')

      if (shouldReconnect) {
        startBot()
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]

      if (!msg.message) return
      if (msg.key.fromMe) return

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        ''

      const command = text.trim().toLowerCase()

      console.log('📩 Message:', text)

      // PING
      if (command === '.ping') {
        const start = Date.now()

        await sock.sendMessage(
          msg.key.remoteJid,
          { text: '🏓 Pinging...' }
        )

        const latency = Date.now() - start

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              `*ʟᴀᴛᴇɴᴄʏ: ${latency.toFixed(2)} _ᴍs_*`
          }
        )

        return
      }

      // ALIVE
      if (command === '.alive') {
        if (alivePic) {
          await sock.sendMessage(
            msg.key.remoteJid,
            {
              image: {
                url: alivePic
              },
              caption: aliveMessage
            }
          )
        } else {
          await sock.sendMessage(
            msg.key.remoteJid,
            {
              text: aliveMessage
            }
          )
        }

        return
      }

      // SET ALIVE
      if (command.startsWith('.setalive ')) {
        const newMessage =
          text.slice(9).trim()

        if (!newMessage) {
          await sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '❌ Use: .setalive Your message'
            }
          )
          return
        }

        aliveMessage = newMessage

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              '✅ Alive message updated!'
          }
        )

        return
      }

      // SET ALIVE HELP
      if (command === '.setalive help') {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
              '🛠️ Use:\n.setalive Your custom message'
          }
        )

        return
      }

      // MENU
      if (command === '.menu') {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`╭═══〘 *𝙇𝙪𝙩𝙩𝙪𝙭𝙚𝙧 𝙈𝘿* 〙═══⊷❍
┃✦╭──────────────
┃✦│ *Owner* : ⏱‹‹ 𝞘𝞵𝞽⃕͜𝞽𝞴𝞺⃕𝞺𝞲 𝞭𝞮⃕͜𝟆 ↲ 🈀🥕
┃✦│ *Mode* : Public
┃✦│ *Bot* : 𝙇𝙪𝙩𝙩𝙪𝙭𝙚𝙧 𝙈𝘿
┃✦│
┃✦│ *Commands*
┃✦│ • .ping
┃✦│ • .alive
┃✦│ • .setalive
┃✦│ • .menu
┃✦│ • .owner
┃✦│ • .sticker
┃✦│ • .toimg
┃✦│ • .tagall
┃✦╰──────────────
╰━━━━━━━━━━━━━━━⊷❍`
          }
        )

        return
      }

      // OWNER
      if (command === '.owner') {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text:
`╭═══〘 *OWNER* 〙═══⊷❍
┃✦╭──────────────
┃✦│ *Name* :⏱‹‹ 𝞘𝞵𝞽⃕͜𝞽𝞴𝞺⃕𝞺𝞲 𝞭𝞮⃕͜𝟆 ↲ 🈀🥕
┃✦│ *Bot* : 𝙇𝙪𝙩𝙩𝙪𝙭𝙚𝙧 𝙈𝘿
┃✦╰──────────────
╰━━━━━━━━━━━━━━━⊷❍`
          }
        )

        return
      }

      // STICKER
      if (
        msg.message.imageMessage &&
        command === '.sticker'
      ) {
        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: '⏳ Creating sticker...'
          }
        )

        try {
          const buffer =
            await downloadMedia(
              msg.message.imageMessage,
              'image'
            )

          const input =
            '/tmp/luttuxer-input.jpg'

          const output =
            '/tmp/luttuxer-sticker.webp'

          fs.writeFileSync(input, buffer)

          await execFileAsync('convert', [
            input,
            '-resize',
            '512x512',
            '-background',
            'none',
            '-gravity',
            'center',
            '-extent',
            '512x512',
            output
          ])

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              sticker:
                fs.readFileSync(output)
            }
          )

        } catch (err) {
          console.log('❌ Sticker Error:', err)

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '❌ Sticker creation failed.'
            }
          )
        }

        return
      }

      // TOIMG
      if (
        msg.message.stickerMessage &&
        command === '.toimg'
      ) {
        try {
          const buffer =
            await downloadMedia(
              msg.message.stickerMessage,
              'sticker'
            )

          const imageBuffer =
            await stickerToImage(buffer)

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              image: imageBuffer
            }
          )

        } catch (err) {
          console.log(
            '❌ ToImg Error:',
            err
          )

          await sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '❌ Sticker to image conversion failed.'
            }
          )
        }

        return
      }

      // TAG ALL
      if (command === '.tagall') {
        if (
          !msg.key.remoteJid.endsWith('@g.us')
        ) {
          await sock.sendMessage(
            msg.key.remoteJid,
            {
              text:
                '❌ .tagall group-il mathram use cheyyam.'
            }
          )

          return
        }

        const groupMetadata =
          await sock.groupMetadata(
            msg.key.remoteJid
          )

        const participants =
          groupMetadata.participants

        const mentions =
          participants.map(p => p.id)

        let tagText =
          '╭═══〘 *𝙏𝘼𝙂 𝘼𝙇𝙇* 〙═══⊷❍\n'

        tagText +=
          '┃✦│ Hello Everyone 🦢🤍\n'

        tagText += '┃✦│\n'

        participants.forEach((p) => {
          tagText +=
            `┃✦│ @${p.id.split('@')[0]}\n`
        })

        tagText +=
          '╰━━━━━━━━━━━━━━━⊷❍'

        await sock.sendMessage(
          msg.key.remoteJid,
          {
            text: tagText,
            mentions
          }
        )

        return
      }

    } catch (err) {
      console.log('❌ Message Error:', err)
    }
  })
}

startBot()
