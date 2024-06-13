import 'module-alias/register'

import bot from '@bot'
import { ALLOWED_UPDATES } from '@constants'
import type { Telegraf } from 'telegraf'

const launchOptions: Telegraf.LaunchOptions = {
  dropPendingUpdates: true,
  allowedUpdates: ALLOWED_UPDATES,
}

bot.launch(launchOptions, () => {
  console.groupCollapsed('> Bot launch')
  console.warn('| Bot launched successfully!')
  console.groupEnd()
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
