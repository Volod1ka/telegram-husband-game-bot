import { DEFAULT_ADMINISTRATOR_RIGHTS } from '@constants/common'
import { BOT_COMMANDS_WITH_DESCRIPTION } from '@constants/interactive'
import { store } from '@stores'
import { handleCatch } from '@tools/utils'
import { Composer } from 'telegraf'
import type { BotContext, ContextFn } from '../context'

// ------- [ context ] ------- //

const handleSetSettings: ContextFn = async (ctx, next) => {
  if (!store.feedbackStore.settingsInitialized) {
    await Promise.all([
      ctx.telegram.setMyCommands(BOT_COMMANDS_WITH_DESCRIPTION),
      ctx.telegram.setMyDefaultAdministratorRights({
        rights: DEFAULT_ADMINISTRATOR_RIGHTS,
      }),
    ]).catch(error => handleCatch(error, ctx))

    store.feedbackStore.settingsInitializedComplete()
  }

  return next()
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.use(handleSetSettings)

export default composer
