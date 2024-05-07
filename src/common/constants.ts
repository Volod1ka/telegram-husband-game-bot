import type { AddParticipantToRoomStatus } from '@game/types'
import { t } from '@i18n'
import type { ActionTrigger, BotCommand, CommandTrigger } from '@models/bot'
import type { GameRoom, RoomEvent, ScenesName } from '@models/game'
import { remainsTime } from '@tools/formatting'
import ms from 'ms'
import { Markup } from 'telegraf'

// ------- [ properties ] ------- //

export const ELIMINATION_SKIPS_COUNT = 1
export const MIN_PARTICIPANTS_COUNT = 2 // 4

export const REGISTRATION_TIMEOUT = ms('15s') //ms('1m')
export const MAX_REGISTRATION_TIMEOUT = ms('3m')
export const EXTEND_REGISTRATION_TIMEOUT = ms('10s') // ms('30s')

// ------- [ default data ] ------- //

export const DEFAULT_GAME_ROOM: GameRoom = {
  answers: new Map(),
  eliminated_participant: null,
  number_of_skips: ELIMINATION_SKIPS_COUNT,
  participants: new Map(),
  question: null,
  registration: null,
  status: 'registration',
} satisfies GameRoom // Represents a new game room

export const EMPTY_ROOM_EVENT: RoomEvent = {
  date_extended: true,
  start_date: 0,
  timeout: null,
  timeout_ms: 0,
} satisfies RoomEvent // Represents an empty room event for handle

// ------- [ scenes name ] ------- //

export const SCENES: Record<ScenesName, ScenesName> = {
  registration: 'registration',
  husband_search: 'husband_search',
  question: 'question',
} // Represents available scenes

// ------- [ interactive ] ------- //

export const BOT_COMMANDS: Record<CommandTrigger, CommandTrigger> = {
  start_game: 'start_game',
  start_game_now: 'start_game_now',
  stop_game: 'stop_game',
  extend_game: 'extend_game',
  help: 'help',
} // Represents available bot commands

export const BOT_ACTIONS: Record<ActionTrigger, ActionTrigger> = {
  participate: 'participate',
  accept_husband_role: 'accept_husband_role',
  deny_husband_role: 'deny_husband_role',
} // Represents available bot actions

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
    description: `продовжити час реєстрації на ${remainsTime(EXTEND_REGISTRATION_TIMEOUT)}`,
  },
  {
    command: BOT_COMMANDS.help,
    description: 'викликати інформацію про допомогу',
  },
] satisfies BotCommand[]

// ------- [ callbacks ] ------- //

export const PARTICIPATE_CALLBACK_ANSWERS: Record<
  AddParticipantToRoomStatus,
  string
> = {
  not_registration: t('answer_cb.participate.not_registration'),
  participant_added: t('answer_cb.participate.participant_added'),
  participant_in_game: t('answer_cb.participate.participant_in_game'),
  room_not_exist: t('answer_cb.participate.room_not_exist'),
} // Represents callback answers for participant actions

// ------- [ inline keyboards ] ------- //

export const INLINE_KEYBOARD_PARTICIPATE = Markup.inlineKeyboard([
  Markup.button.callback(t('button.participate'), BOT_ACTIONS.participate),
]) // Represents an inline keyboard for participant action

export const INLINE_KEYBOARD_INVITE_CHAT = (bot_username: string) =>
  Markup.inlineKeyboard([
    Markup.button.url(
      t('button.invite_to_chat'),
      `https://t.me/${bot_username}?startgroup=true`,
    ),
  ]) // Represents an inline keyboard for invite a bot to groups

export const INLINE_KEYBOARD_ROLE = Markup.inlineKeyboard([
  [
    Markup.button.callback(t('button.yes'), BOT_ACTIONS.accept_husband_role),
    Markup.button.callback(t('button.no'), BOT_ACTIONS.deny_husband_role),
  ],
])
