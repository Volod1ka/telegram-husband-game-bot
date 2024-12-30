import { t } from '@i18n'
import type { Participant } from '@models/roles'
import type { User } from '@telegraf/types'
import { Markup } from 'telegraf'
import { TELEGRAM_LINK } from './common'
import { BOT_ACTIONS } from './interactive'

export const getInlineKeyboardParticipate = (bot_username: string) =>
  Markup.inlineKeyboard([
    [Markup.button.callback(t('button.participate'), BOT_ACTIONS.participate)],
    [
      Markup.button.url(
        t('button.go_to_chat'),
        `${TELEGRAM_LINK}${bot_username}`,
      ),
    ],
  ])

export const getInlineKeyboardInviteChat = (bot_username: string) =>
  Markup.inlineKeyboard([
    Markup.button.url(
      t('button.invite_to_chat'),
      `${TELEGRAM_LINK}${bot_username}?startgroup=true`,
    ),
  ])

export const getInlineKeyboardRole = Markup.inlineKeyboard([
  [
    Markup.button.callback(t('button.yes'), BOT_ACTIONS.accept_husband_role),
    Markup.button.callback(t('button.no'), BOT_ACTIONS.deny_husband_role),
  ],
])

export const getInlineKeyboardChatWithBot = (bot_username: string) =>
  Markup.inlineKeyboard([
    Markup.button.url(
      t('button.go_to_chat'),
      `${TELEGRAM_LINK}${bot_username}`,
    ),
  ])

export const getInlineKeyboardElimination = (
  members: [User['id'], Participant][],
  canSkip: boolean,
) => {
  const replyMarkup = []

  for (const [memberId, member] of members) {
    if (member.role !== 'member') {
      continue
    }

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
