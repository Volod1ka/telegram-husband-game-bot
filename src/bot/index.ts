import Config from '@config'
import { SCENES } from '@constants'
import { getSessionKey, logHandleError } from '@tools/utils'
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
bot.use(settingsComposer)
bot.use(permissionsComposer)
bot.use(echoComposer)
bot.use(stage.middleware())

bot.catch(logHandleError)

export default bot

// TODO: set languale
// ctx.reply(t('hi.text', { lng: 'en' satisfies Language }))
// ctx.sendDice({})
// ctx.sendChatAction('typing')
