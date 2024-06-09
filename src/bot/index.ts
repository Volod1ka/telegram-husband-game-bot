import Config from '@config'
import { SCENES } from '@constants'
import { getSessionKey } from '@tools/utils'
import { format, toDate } from 'date-fns'
import { Scenes, Telegraf, session } from 'telegraf'
import {
  echoComposer,
  permissionsComposer,
  settingsComposer,
} from './composers'
import type { BotContext, SessionOptions } from './context'
import { allScenes } from './scenes'

if (!Config.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided!\nP.S. Check your .env file.')
}

const bot = new Telegraf<BotContext>(Config.BOT_TOKEN)
const stage = new Scenes.Stage<BotContext>(allScenes, {
  default: SCENES.registration,
})

const sessionOptions = { getSessionKey } satisfies SessionOptions

bot.use(session(sessionOptions))
bot.use(settingsComposer, permissionsComposer, echoComposer)
bot.use(stage.middleware())

bot.catch((error, ctx) => {
  const date = format(toDate(Date.now()), '[dd/MM/yyyy – kk:mm:ss]')
  const chat = JSON.stringify(ctx.chat)
  const from = JSON.stringify(ctx.from)
  const details = error instanceof TypeError ? error : JSON.stringify(error)

  console.groupCollapsed(`\n${date} ≈> error:`)
  console.log(`| chat: ${chat}\n| from: ${from}\n|\n| details: ${details}\n`)
  console.groupEnd()
})

export default bot

// TODO: set languale
// ctx.reply(t('hi.text', { lng: 'en' satisfies Language }))
