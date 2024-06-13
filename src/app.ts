import 'module-alias/register'

import bot from '@bot'
import type { Telegraf } from 'telegraf'

const launchOptions: Telegraf.LaunchOptions = {
  dropPendingUpdates: true,
  allowedUpdates: ['message', 'callback_query', 'my_chat_member'],
}

bot.launch(launchOptions, () => {
  console.groupCollapsed('> Bot launch')
  console.warn('| Bot launched successfully!')
  console.groupEnd()
})

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
