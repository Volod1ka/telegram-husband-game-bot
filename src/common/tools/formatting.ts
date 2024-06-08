import { EMPTY_ANSWER, TELEGRAM_MENTION } from '@constants'
import { t } from '@i18n'
import type { GameRoom } from '@models/game'
import type { Participant } from '@models/roles'
import type { Chat, User } from '@telegraf/types'
import { formatDuration, intervalToDuration } from 'date-fns'
import { uk } from 'date-fns/locale'

export const MAX_SHOWN_USER_NAME_LENGTH = 20

export const shortNameParticipant = (user: User) => {
  return user.first_name.length > MAX_SHOWN_USER_NAME_LENGTH
    ? `${user.first_name.substring(0, MAX_SHOWN_USER_NAME_LENGTH)}…`
    : user.first_name
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

export const remainsTime = (ms: number) => {
  return formatDuration(intervalToDuration({ start: 0, end: ms }), {
    format: ['minutes', 'seconds'],
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

    lines += t('member.answers.line', {
      number,
      answer: answer || EMPTY_ANSWER,
    })

    if (afk && !eliminated) {
      afks += t('member.answers.afk', {
        number,
        user: mentionWithHTML(user),
      })
    }
  }

  return `${t('member.answers.base')}${lines}${afks}`
}
