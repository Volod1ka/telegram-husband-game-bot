import {
  EMPTY_ANSWER,
  MAX_SHOWN_USER_NAME_LENGTH,
  TELEGRAM_MENTION,
} from '@constants'
import { t } from '@i18n'
import type { GameRoom } from '@models/game'
import type { Participant } from '@models/roles'
import type { Chat, User } from '@telegraf/types'
import { formatDuration, intervalToDuration } from 'date-fns'
import { uk } from 'date-fns/locale'
import { getRandomText } from './utils'

export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const lowercaseFirstLetter = (text: string): string => {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

export const shortNameParticipant = ({ first_name }: User) => {
  return first_name.length > MAX_SHOWN_USER_NAME_LENGTH
    ? `${first_name.substring(0, MAX_SHOWN_USER_NAME_LENGTH)}…`
    : first_name
}

export const mentionWithHTML = (user: User) => {
  return `<a href="${TELEGRAM_MENTION}${user.id}">${shortNameParticipant(user)}</a>`
}

export const mentionsOfParticipants = (
  participants: GameRoom['participants'],
) => {
  return [...participants.values()]
    .map(participant => mentionWithHTML(participant.user))
    .join(', ')
}

export const remainsTime = (startMs: number = 0, endMs: number) => {
  return formatDuration(intervalToDuration({ start: startMs, end: endMs }), {
    format: ['hours', 'minutes', 'seconds'],
    locale: uk,
  })
}

export const answerOfMembers = (
  membersInGame: [Chat['id'], Participant][],
  answers: GameRoom['answers'],
) => {
  let lines = ''
  let afks = ''

  for (const [memberId, member] of membersInGame) {
    if (member.role !== 'member') continue

    const { afk, eliminated, number, user } = member
    const answer = answers.get(memberId)
    const modifiedAnswer = answer?.length
      ? capitalizeFirstLetter(answer)
      : EMPTY_ANSWER

    lines += t('member.answers.line', {
      number,
      answer: modifiedAnswer,
    })

    if (afk && !eliminated) {
      afks += t('member.answers.afk', {
        number,
        user: mentionWithHTML(user),
        details: getRandomText(
          t('comments.answers.afk', { returnObjects: true }),
        ),
      })
    }
  }

  return `${t('member.answers.base')}${lines}${afks}`
}
