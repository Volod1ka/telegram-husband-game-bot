import {
  BOT_COMMANDS_WITH_DESCRIPTION,
  DEFAULT_ADMINISTRATOR_RIGHTS,
} from '@constants'
import { Composer } from 'telegraf'
import type { BotContext, ContextFn } from '../context'

// ------- [ variables ] ------- //

// TODO: Reduce Global State
let settingsInitialized = false

// ------- [ context ] ------- //

const handleSetSettings: ContextFn = async (ctx, next) => {
  if (!settingsInitialized) {
    await Promise.all([
      ctx.telegram.setMyCommands(BOT_COMMANDS_WITH_DESCRIPTION).catch(),
      ctx.telegram
        .setMyDefaultAdministratorRights({
          rights: DEFAULT_ADMINISTRATOR_RIGHTS,
        })
        .catch(),
    ])

    settingsInitialized = true
  }

  return next()
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.use(handleSetSettings)

export default composer
