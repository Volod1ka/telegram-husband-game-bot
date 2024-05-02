import type { GameRoom } from '@models/game'
import type { User } from '@telegraf/types'
import { formatDuration, intervalToDuration } from 'date-fns'
import { uk } from 'date-fns/locale'

export const MAX_SHOWN_USER_NAME_LENGTH = 20

export const shortNameParticipant = (user: User) => {
  return user.first_name.length > MAX_SHOWN_USER_NAME_LENGTH
    ? `${user.first_name.substring(0, MAX_SHOWN_USER_NAME_LENGTH)}…`
    : user.first_name
}

export const mentionWithMarkdownV2 = (user: User) => {
  return `[${shortNameParticipant(user)}](tg://user?id=${user.id})`
}

export const mentionsOfParticipants = (
  participants: GameRoom['participants'],
) => {
  return Array.from(participants.values())
    .map(participant => mentionWithMarkdownV2(participant.user))
    .join(', ')
}

export const remainsTime = (ms: number) => {
  return formatDuration(intervalToDuration({ start: 0, end: ms }), {
    format: ['minutes', 'seconds'],
    locale: uk,
  })
}
