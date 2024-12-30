import {
  EMPTY_ANSWER,
  MAX_TEXT_MESSAGE_LENGTH,
  TELEGRAM_MENTION,
} from '@constants/common'
import {
  EXTRA_MAX_SHOWN_USER_NAME_LENGTH,
  MAX_SHOWN_USER_NAME_LENGTH,
} from '@constants/properties'
import { HTML_TAG_SYMBOLS_PATTERN } from '@constants/regex'
import { t } from '@i18n'
import type { GameRoom } from '@models/game'
import type { Participant } from '@models/roles'
import type { Chat, User } from '@telegraf/types'
import { formatDuration, intervalToDuration } from 'date-fns'
import { uk } from 'date-fns/locale'
import { getRandomText } from './utils'

export const safeSlice = (
  text: string,
  start: number,
  end?: number,
): string => {
  return Array.from(text).slice(start, end).join('')
}

export const capitalizeFirstLetter = (text: string): string => {
  return text.charAt(0).toUpperCase() + safeSlice(text, 1)
}

export const lowercaseFirstLetter = (text: string): string => {
  return text.charAt(0).toLowerCase() + safeSlice(text, 1)
}

export const shortNameParticipant = ({ first_name }: User) => {
  return first_name.length >
    MAX_SHOWN_USER_NAME_LENGTH + EXTRA_MAX_SHOWN_USER_NAME_LENGTH
    ? `${safeSlice(first_name, 0, MAX_SHOWN_USER_NAME_LENGTH)}…`
    : first_name
}

export const mentionWithHTML = (user: User, text: string = '') => {
  const mentionText = text.length > 0 ? text : shortNameParticipant(user)

  return `<a href="${TELEGRAM_MENTION}${user.id}">${formattedTextForHTML(mentionText)}</a>`
}

export const formattedTextForHTML = (text: string) => {
  const SYMBOLS_TO_REPLACE: Record<string, string> = {
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
  }

  return text.replace(
    HTML_TAG_SYMBOLS_PATTERN,
    match => SYMBOLS_TO_REPLACE[match] ?? match,
  )
}

export const formattedChatTitleForHTML = (chat: Chat) => {
  return chat.type !== 'private' ? formattedTextForHTML(chat.title) : ''
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

export const getAnswerOfMembers = (
  membersInGame: [User['id'], Participant][],
  answers: GameRoom['answers'],
) => {
  let currentMessageIndex = 0
  const result: string[] = [t('member.answers.base')]
  const answerLines: string[] = []
  const afkMessages: string[] = []

  for (const [memberId, member] of membersInGame) {
    if (member.role !== 'member') {
      continue
    }

    const { afk, eliminated, number, user } = member
    const answer = answers.get(memberId)
    const formattedAnswer = answer?.length
      ? capitalizeFirstLetter(answer)
      : EMPTY_ANSWER

    answerLines.push(
      t('member.answers.line', {
        number,
        answer: formattedAnswer,
      }),
    )

    if (afk && !eliminated) {
      afkMessages.push(
        t('member.answers.afk', {
          number,
          user: mentionWithHTML(user),
          details: getRandomText(
            t('comments.answers.afk', { returnObjects: true }),
          ),
        }),
      )
    }
  }

  const appendLinesToResult = (lines: string[]) => {
    for (const line of lines) {
      if (
        result[currentMessageIndex].length + line.length >
        MAX_TEXT_MESSAGE_LENGTH
      ) {
        result.push('')
        currentMessageIndex++
      }
      result[currentMessageIndex] += line
    }
  }

  appendLinesToResult(answerLines)
  appendLinesToResult(afkMessages)

  return result
}
