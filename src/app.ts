import 'module-alias/register'

import bot from '@bot'
import type { Telegraf } from 'telegraf'

const launchOptions: Telegraf.LaunchOptions = {
  allowedUpdates: [],
}

bot.launch(launchOptions, () => console.log('Bot launched successfully!'))
