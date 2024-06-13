import type { AddParticipantToRoomStatus } from '@game/types'
import { t } from '@i18n'
import type { ActionTrigger, BotCommand, CommandTrigger } from '@models/bot'
import type { GameRoom, RoomEvent, ScenesName } from '@models/game'
import type { Participant } from '@models/roles'
import type {
  ChatAdministratorRights,
  TelegramEmoji,
  User,
} from '@telegraf/types'
import { remainsTime } from '@tools/formatting'
import ms from 'ms'
import { Markup } from 'telegraf'
import type { UpdateType } from 'telegraf/typings/telegram-types'

// ------- [ properties ] ------- //

const DEV = false

export const MAX_SHOWN_USER_NAME_LENGTH = 20

export const ELIMINATION_SKIPS_AMOUNT = 1
export const MIN_PARTICIPANTS_AMOUNT = DEV ? 2 : 4
export const MAX_PARTICIPANTS_AMOUNT = 15

export const MAX_ANSWER_LENGTH = 420
export const MAX_QUESTION_LENGTH = 320
export const MAX_HUSBAND_MESSAGE_LENGTH = 360

export const REGISTRATION_TIMEOUT = ms(DEV ? '20s' : '1m')
export const MAX_REGISTRATION_TIMEOUT = ms('3m')
export const EXTEND_REGISTRATION_TIMEOUT = ms('30s')
export const ACCEPT_HUSBAND_ROLE_TIMEOUT = ms(DEV ? '20s' : '40s')
export const QUESTION_TIMEOUT = ms(DEV ? '20s' : '4m')
export const ANSWERS_TIMEOUT = ms(DEV ? '50s' : '5m')
export const ELIMINATION_TIMEOUT = ms(DEV ? '20s' : '10m')

export const AUTO_CLEAR_MESSAGE_TIMEOUT = ms('7s')

export const REGISTRATION_REMIND_TIMEOUT = ms('10s')

// ------- [ default data ] ------- //

export const TELEGRAM_LINK = 'https://t.me/'
export const TELEGRAM_MESSAGE_LINK = `${TELEGRAM_LINK}c/`
export const TELEGRAM_MENTION = 'tg://user?id='

export const MAX_TEXT_MESSAGE_LENGTH = 4096

export const EMPTY_ANSWER = ' – '

export const DEFAULT_GAME_ROOM: GameRoom = {
  startDate: Date.now(),
  answers: new Map(),
  numberOfSkips: ELIMINATION_SKIPS_AMOUNT,
  participants: new Map(),
  registration: null,
  status: 'registration',
} satisfies GameRoom

export const EMPTY_ROOM_EVENT: RoomEvent = {
  callback: async () => {},
  timeout: null,
  startDate: 0,
  dateExtended: true,
  timeoutMs: 0,
} satisfies RoomEvent

export const REACTIONS: TelegramEmoji[] = [
  '🍌',
  '🍓',
  '🍾',
  '👀',
  '👍',
  '💅',
  '🔥',
  '👌',
  '🤝',
  '✍',
  '🆒',
  '❤‍🔥',
  '💘',
  '💋',
  '🕊',
  '😈',
  '👏',
  '💘',
  '💯',
  '⚡',
] satisfies TelegramEmoji[]

export const DEFAULT_ADMINISTRATOR_RIGHTS: ChatAdministratorRights = {
  can_change_info: false,
  can_delete_messages: true,
  can_invite_users: false,
  can_manage_chat: true,
  can_manage_video_chats: false,
  can_promote_members: false,
  can_restrict_members: false,
  is_anonymous: false,
  can_pin_messages: true,
} satisfies ChatAdministratorRights

export const ALLOWED_UPDATES: UpdateType[] = [
  'message',
  'callback_query',
  'my_chat_member',
  'message_reaction',
] satisfies UpdateType[]

// ------- [ scenes name ] ------- //

export const SCENES: Record<ScenesName, ScenesName> = {
  registration: 'registration',
  search_husband: 'search_husband',
  question: 'question',
  answers: 'answers',
  elimination: 'elimination',
  finished: 'finished',
}

// ------- [ interactive ] ------- //

export const BOT_COMMANDS: Record<CommandTrigger, CommandTrigger> = {
  start_game: 'start_game',
  start_game_now: 'start_game_now',
  stop_game: 'stop_game',
  extend_game: 'extend_game',
  help: 'help',
}

export const BOT_ACTIONS: Record<ActionTrigger, ActionTrigger> = {
  participate: 'participate',
  accept_husband_role: 'accept_husband_role',
  deny_husband_role: 'deny_husband_role',
  skip_elimination: 'skip_elimination',
}

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

// ------- [ callback ] ------- //

export const PARTICIPATE_CALLBACK_ANSWERS: Record<
  AddParticipantToRoomStatus,
  string
> = {
  not_registration: t('answer_cb.participate.not_registration'),
  participant_added: t('answer_cb.participate.participant_added'),
  participant_in_game: t('answer_cb.participate.participant_in_game'),
  room_not_exist: t('answer_cb.participate.room_not_exist'),
}

// ------- [ inline keyboard ] ------- //

export const INLINE_KEYBOARD_PARTICIPATE = (bot_username: string) =>
  Markup.inlineKeyboard([
    [Markup.button.callback(t('button.participate'), BOT_ACTIONS.participate)],
    [
      Markup.button.url(
        t('button.go_to_chat'),
        `${TELEGRAM_LINK}${bot_username}`,
      ),
    ],
  ])

export const INLINE_KEYBOARD_INVITE_CHAT = (bot_username: string) =>
  Markup.inlineKeyboard([
    Markup.button.url(
      t('button.invite_to_chat'),
      `${TELEGRAM_LINK}${bot_username}?startgroup=true`,
    ),
  ])

export const INLINE_KEYBOARD_ROLE = Markup.inlineKeyboard([
  [
    Markup.button.callback(t('button.yes'), BOT_ACTIONS.accept_husband_role),
    Markup.button.callback(t('button.no'), BOT_ACTIONS.deny_husband_role),
  ],
])

export const INLINE_KEYBOARD_CHAT_WITH_BOT = (bot_username: string) =>
  Markup.inlineKeyboard([
    Markup.button.url(
      t('button.go_to_chat'),
      `${TELEGRAM_LINK}${bot_username}`,
    ),
  ])

export const INLINE_KEYBOARD_ELIMINATION = (
  members: [User['id'], Participant][],
  canSkip: boolean,
) => {
  const replyMarkup = []

  for (const [memberId, member] of members) {
    if (member.role !== 'member') continue

    replyMarkup.push(
      Markup.button.callback(
        t('button.participant', { number: member.number }),
        `${memberId}`,
      ),
    )
  }

  replyMarkup.push(
    Markup.button.callback(
      t('button.skip'),
      BOT_ACTIONS.skip_elimination,
      !canSkip,
    ),
  )

  return Markup.inlineKeyboard(replyMarkup, { columns: 1 })
}
