const { BufferJSON, WA_DEFAULT_EPHEMERAL, generateWAMessageFromContent, proto, generateWAMessageContent, generateWAMessage, prepareWAMessageMedia, areJidsSameUser, getContentType } = require('@adiwajshing/baileys')
let fs = require('fs')
let path = require('path')
let fetch = require('node-fetch')
let moment = require('moment-timezone')
let levelling = require('../lib/levelling')
let tags = {
  'rpgabsen': '❏ R P G - A B S E N',
  'rpg': '❏ R P G - M E N U',
  'game': '❏ G A M E S - M E N U',
  'xp': '❏ EXP & L I M I T',
  'sticker': '❏ C O N V E R T E R',
  'main': '❏ M A I N - M E N U',
  'kerang': '❏ K E R A N G - M E N U',
  'quotes': '❏ Q U O T E S',
  'admin': '❏ A D M I N - M E N U',
  'group': '❏ G R O U P - M E N U',
  'internet': '❏ I N T E R N E T',
  'anonymous': '❏ A N O N Y M O U S',
  'downloader': '❏ D O W N L O A D E R',
  'berita': '❏ B E R I T A',
  'tools': '❏ T O O L S - M E N U',
  'fun': '❏ F U N - M E N U',
  'database': '❏ D A T A - B O T', 
  'vote': '❏ V O T I N G',
  'absen': '❏ A B S E N',
  'catatan': '❏ C A T A T A N',
  'jadian': '❏ P A C A R A N',
  'islami': '❏ I S L A M I',
  'owner': '❏ D E V E L O P E R',
  'advanced': '❏ E V A L - C O D E',
  'info': '❏ I N F O R M A S I',
  'audio': '❏ A U D I O - M E N U',
  'maker': '❏ M A K E R - M E N U',
}
const defaultMenu = {
  before: `
Hai, %ucapan %name!👋
❑ *Hari:* %week
❑ *Tanggal:* %date
❑ *Uptime:* %uptime (%muptime)
❑ *Limit:* %limit
❑ *Level:* %level
❑ *XP:* %exp

`.trimStart(),
  header: ' *%category*',
  body: ' • %cmd %islimit %isPremium',
  footer: '\n',
  after: `*Date*
*%date* | %week
${'```%npmdesc```'}
`,
}
let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    let package = JSON.parse(await fs.promises.readFile(path.join(__dirname, '../package.json')).catch(_ => '{}'))
    let { exp, limit, level, role } = global.db.data.users[m.sender]
    let { min, xp, max } = levelling.xpRange(level, global.multiplier)
    let name = await conn.getName(m.sender)
    let d = new Date(new Date + 3600000)
    let locale = 'id'
    // d.getTimeZoneOffset()
    // Offset -420 is 18.00
    // Offset    0 is  0.00
    // Offset  420 is  7.00
    const wib = moment.tz('Asia/Jakarta').format("HH:mm:ss")
    const wita = moment.tz('Asia/Makassar').format("HH:mm:ss")
    const wit = moment.tz('Asia/Jayapura').format("HH:mm:ss")
    let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(d / 84600000) % 5]
    let week = d.toLocaleDateString(locale, { weekday: 'long' })
    let date = d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    let dateIslamic = Intl.DateTimeFormat(locale + '-TN-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d)
    let time = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    let _uptime = process.uptime() * 1000
    let _muptime
    if (process.send) {
      process.send('uptime')
      _muptime = await new Promise(resolve => {
        process.once('message', resolve)
        setTimeout(resolve, 1000)
      }) * 1000
    }
    let muptime = clockString(_muptime)
    let uptime = clockString(_uptime)
    let totalreg = Object.keys(global.db.data.users).length
    let rtotalreg = Object.values(global.db.data.users).filter(user => user.registered == true).length
    let help = Object.values(global.plugins).filter(plugin => !plugin.disabled).map(plugin => {
      return {
        help: Array.isArray(plugin.tags) ? plugin.help : [plugin.help],
        tags: Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags],
        prefix: 'customPrefix' in plugin,
        limit: plugin.limit,
        premium: plugin.premium,
        enabled: !plugin.disabled,
      }
    })
    for (let plugin of help)
      if (plugin && 'tags' in plugin)
        for (let tag of plugin.tags)
          if (!(tag in tags) && tag) tags[tag] = tag
    conn.menu = conn.menu ? conn.menu : {}
    let before = conn.menu.before || defaultMenu.before
    let header = conn.menu.header || defaultMenu.header
    let body = conn.menu.body || defaultMenu.body
    let footer = conn.menu.footer || defaultMenu.footer
    let after = conn.menu.after || (conn.user.jid == global.conn.user.jid ? '' : `Powered by https://wa.me/${global.conn.user.jid.split`@`[0]}`) + defaultMenu.after
    let _text = [
      before,
      ...Object.keys(tags).map(tag => {
        return header.replace(/%category/g, tags[tag]) + '\n' + [
          ...help.filter(menu => menu.tags && menu.tags.includes(tag) && menu.help).map(menu => {
            return menu.help.map(help => {
              return body.replace(/%cmd/g, menu.prefix ? help : '%p' + help)
                .replace(/%islimit/g, menu.limit ? '  ' : '')
                .replace(/%isPremium/g, menu.premium ? '  ' : '')
                .trim()
            }).join('\n')
          }),
          footer
        ].join('\n')
      }),
      after
    ].join('\n')
    text = typeof conn.menu == 'string' ? conn.menu : typeof conn.menu == 'object' ? _text : ''
    let replace = {
      '%': '%',
      p: _p, uptime, muptime,
      me: conn.getName(conn.user.jid),
      ucapan: ucapan(),
      npmname: package.name,
      npmdesc: package.description,
      version: package.version,
      exp: exp - min,
      maxexp: xp,
      totalexp: exp,
      xp4levelup: max - exp,
      github: package.homepage ? package.homepage.url || package.homepage : '[unknown github url]',
      level, limit, name, weton, week, date, dateIslamic, wib, wit, wita, time, totalreg, rtotalreg, role,
      readmore: readMore
    }
    text = text.replace(new RegExp(`%(${Object.keys(replace).sort((a, b) => b.length - a.length).join`|`})`, 'g'), (_, name) => '' + replace[name])
    conn.sendHydrated(m.chat, text.trim(), 'Sewa bot 5k permanen', null, 'https://wa.me/18312576749', 'Contact Owner', '', '', [
      ['Rules bot', '/donasi'],
      ['Sewa bot', '/sewa'],
    ], m)
    /*let url = `https://telegra.ph/file/00492e657e2d1eeb8b569.jpg`.trim()
    let res = await fetch(url)
    let buffer = await res.buffer()
    let message = await prepareWAMessageMedia({ image: buffer }, { upload: conn.waUploadToServer })
                const template = generateWAMessageFromContent(m.chat, proto.Message.fromObject({
                    templateMessage: {
                        hydratedTemplate: {
                            imageMessage: message.imageMessage,
                            hydratedContentText: text.trim(),
                            hydratedFooterText:'Ⓟ premium | Ⓛ limit',
                            hydratedButtons: [{
                                urlButton: {
                                    displayText: 'Website',
                                    url: 'https://Ainebot.github.io/'
                                }
                            }, {
                                quickReplyButton: {
                                    displayText: 'Donasi',
                                    id: '/donasi'
                                }
                            }, {
                                quickReplyButton: {
                                    displayText: 'Sewa',
                                    id: '/sewa'
                                }  
                            }, {
                                quickReplyButton: {
                                    displayText: 'Owner',
                                    id: '/owner'
                                }
                            }]
                        }
                    }
                }), { userJid: m.chat, quoted: m })
                conn.relayMessage(m.chat, template.message, { messageId: template.key.id })*/
  } catch (e) {
    conn.reply(m.chat, 'Maaf, menu sedang error', m)
    throw e
  }
}
handler.help = ['menu']
handler.tags = ['main']
handler.command = /^(menu|help|\?)$/i

handler.exp = 3

module.exports = handler

const more = String.fromCharCode(8206)
const readMore = more.repeat(4001)

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

function ucapan() {
        const hour_now = moment.tz('Asia/Jakarta').format('HH')
        var ucapanWaktu = 'Pagi kak🌁'
        if (hour_now >= '03' && hour_now <= '10') {
          ucapanWaktu = 'Pagi kak🏞️'
        } else if (hour_now >= '10' && hour_now <= '15') {
          ucapanWaktu = 'Siang kak🏖️️'
        } else if (hour_now >= '15' && hour_now <= '17') {
          ucapanWaktu = 'Sore kak🌇'
        } else if (hour_now >= '17' && hour_now <= '18') {
          ucapanWaktu = 'Selamat Petang kak🏙️'
        } else if (hour_now >= '18' && hour_now <= '23') {
          ucapanWaktu = 'Malam kak🌆'
        } else {
          ucapanWaktu = 'Selamat Malam!'
        }	
        return ucapanWaktu
}
