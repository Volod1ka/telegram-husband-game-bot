import 'module-alias/register'

import bot from '@bot'
import type { Telegraf } from 'telegraf'

const launchOptions: Telegraf.LaunchOptions = {}

bot.launch(launchOptions, () => {
  console.groupCollapsed('> Bot launch')
  console.warn('| Bot launched successfully!')
  console.groupEnd()
})
