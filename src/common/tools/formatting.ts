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

export const mentionWithMarkdownV2 = (user: User) => {
  return `[${shortNameParticipant(user)}](${TELEGRAM_MENTION}${user.id})`
}

export const mentionWithHTML = (user: User) => {
  return `<a href="${TELEGRAM_MENTION}${user.id}">${shortNameParticipant(user)}</a>`
}

export const mentionsOfParticipants = (
  participants: GameRoom['participants'],
) => {
  return [...participants.values()]
    .map(participant => mentionWithMarkdownV2(participant.user))
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

    const answer = answers.get(memberId)

    lines += t('member.answers.line', {
      number: member.number,
      answer: answer?.length ? answer : EMPTY_ANSWER,
    })

    if (member.afk) {
      afks += t('member.answers.afk', {
        number: member.number,
        user: mentionWithHTML(member.user),
      })
    }
  }

  return `${t('member.answers.base')}${lines}${afks}`
}