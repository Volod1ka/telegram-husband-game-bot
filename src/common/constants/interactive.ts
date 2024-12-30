import type { ActionTrigger, BotCommand, CommandTrigger } from '@models/bot'
import { remainsTime } from '@tools/formatting'
import { EXTEND_REGISTRATION_TIMEOUT } from './properties'

export const BOT_COMMANDS: Record<CommandTrigger, CommandTrigger> = {
  start_game: 'start_game',
  start_game_now: 'start_game_now',
  stop_game: 'stop_game',
  extend_game: 'extend_game',
  help: 'help',
} as const

export const BOT_ACTIONS: Record<ActionTrigger, ActionTrigger> = {
  participate: 'participate',
  accept_husband_role: 'accept_husband_role',
  deny_husband_role: 'deny_husband_role',
  skip_elimination: 'skip_elimination',
} as const

export const BOT_COMMANDS_WITH_DESCRIPTION: BotCommand[] = [
  {
    command: BOT_COMMANDS.start_game,
    description: 'розпочати нову гру (реєстрація учасників)',
  },
  {
    command: BOT_COMMANDS.start_game_now,
    description: 'завершити реєстрацію та розпочати гру',
  },
  {
    command: BOT_COMMANDS.stop_game,
    description: 'зупинити реєстрацію учасників до гри',
  },
  {
    command: BOT_COMMANDS.extend_game,
    description: `продовжити час реєстрації на ${remainsTime(undefined, EXTEND_REGISTRATION_TIMEOUT)}`,
  },
  {
    command: BOT_COMMANDS.help,
    description: 'викликати інформацію про допомогу',
  },
] satisfies BotCommand[]
