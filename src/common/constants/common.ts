import type { GameRoom, RoomEvent } from '@models/game'
import type { ChatAdministratorRights, TelegramEmoji } from '@telegraf/types'
import type { UpdateType } from 'telegraf/typings/telegram-types'
import { ELIMINATION_SKIPS_AMOUNT } from './properties'

export const TELEGRAM_LINK = 'https://t.me/' as const
export const TELEGRAM_MESSAGE_LINK = `${TELEGRAM_LINK}c/` as const
export const TELEGRAM_MENTION = 'tg://user?id=' as const

export const MAX_TEXT_MESSAGE_LENGTH = 4096 as const

export const EMPTY_ANSWER = ' – ' as const

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
