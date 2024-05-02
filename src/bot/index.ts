import Config from '@config'
import { SCENES } from '@constants'
import { getSessionKey } from '@tools/utils'
import { toDate } from 'date-fns'
import { Scenes, Telegraf, session } from 'telegraf'
import { mainComposer } from './composers'
import type { BotContext } from './context'
import { husbandSearchScene, questionScene, registrationScene } from './scenes'

if (!Config.BOT_TOKEN) {
  throw new Error('BOT_TOKEN must be provided!\nP.S. Check your .env file.')
}

const bot = new Telegraf<BotContext>(Config.BOT_TOKEN)
const stage = new Scenes.Stage<BotContext>(
  [registrationScene, husbandSearchScene, questionScene],
  {
    default: SCENES.registration,
  },
)

bot.use(
  session({
    getSessionKey,
  }),
)
bot.use(mainComposer)
bot.use(stage.middleware())
// bot.use(async (ctx, next) => {
//   ctx.telegram.setMyCommands(BOT_COMMANDS_WITH_DESCRIPTION)

//   return await next()
// })

bot.catch(error => {
  const date = toDate(Date.now()).toISOString()
  console.log(`[${date}] error: ${JSON.stringify(error)}\n`)
})

export default bot

// TODO: set languale
// ctx.reply(t('hi.text', { lng: 'en' satisfies Language }))
