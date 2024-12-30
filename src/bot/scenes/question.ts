import { getInlineKeyboardChatWithBot } from '@constants/inlineKeyboard'
import { MAX_QUESTION_LENGTH, QUESTION_TIMEOUT } from '@constants/properties'
import { SCENES } from '@constants/scene'
import game from '@game/engine'
import { t } from '@i18n'
import type { Chat, User } from '@telegraf/types'
import {
  capitalizeFirstLetter,
  formattedTextForHTML,
  mentionWithHTML,
} from '@tools/formatting'
import { getRandomEmoji, logHandleError, logHandleInfo } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type {
  BotContext,
  ContextFn,
  GuardTextMessageFn,
  TextMessageFn,
} from '../context'

// ------- [ utility functions ] ------- //

const handleTimeoutEvent = async (
  ctx: BotContext,
  chatId: Chat['id'],
  husbandId: User['id'],
) => {
  const [, { user }] = game.getHusbandInGame(chatId)!

  await Promise.all([
    ctx.telegram.sendMessage(
      chatId,
      t('husband.question.afk.chat', {
        husband: mentionWithHTML(user, t('husband.name')),
      }),
      { parse_mode: 'HTML' },
    ),
    ctx.telegram.sendMessage(husbandId, t('husband.question.afk.personal'), {
      parse_mode: 'HTML',
    }),
  ]).catch(error => logHandleError(error, ctx))

  game.completeHusbandQuestion(chatId, true)

  logHandleInfo(t('log.game.over.not_question', { chat_id: chatId }), ctx)
  await ctx.scene.enter(SCENES.finished)
}

// ------- [ bot context ] ------- //

const requestForQuestion: ContextFn = async ctx => {
  if (!ctx.from) {
    return ctx.scene.reset()
  }

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) {
    // TODO: Unfortunately, the room could not be created
    return ctx.scene.reset()
  }

  const [roomId] = currentRoom
  const husband = game.getHusbandInGame(roomId)

  if (!husband) {
    return ctx.scene.reset()
  }

  await ctx.telegram.sendMessage(
    husband[0],
    t('husband.question.base', { amount: MAX_QUESTION_LENGTH }),
    { parse_mode: 'HTML' },
  )

  game.registerTimeoutEvent(
    roomId,
    async () => handleTimeoutEvent(ctx, roomId, husband[0]),
    QUESTION_TIMEOUT,
  )
}

// ------- [ text message ] ------- //

const checkSendQuestionAvailability: TextMessageFn = async (ctx, next) => {
  if (ctx.chat.type !== 'private') {
    return
  }

  if (!game.isHusbandRole(ctx.message.from.id)) {
    return ctx.react('👨‍💻')
  }

  if (ctx.message.text.length > MAX_QUESTION_LENGTH) {
    return Promise.all([
      ctx.react('🙈'),
      ctx.replyWithHTML(t('husband.question.too_long')),
    ])
  }

  return next()
}

const handleSendQuestion: TextMessageFn = async ctx => {
  const userId = ctx.message.from.id
  const [roomId] = game.getRoomOfUser(userId)!
  const textMessage = t('husband.send_question', {
    question: capitalizeFirstLetter(formattedTextForHTML(ctx.message.text)),
  })

  game.unregisterTimeoutEvent(roomId)

  const [, { message_id }] = await Promise.all([
    ctx.react(getRandomEmoji()),
    ctx.telegram.sendMessage(roomId, textMessage, {
      parse_mode: 'HTML',
      reply_markup: getInlineKeyboardChatWithBot(ctx.botInfo.username)
        .reply_markup,
    }),
  ])

  game.setQuestionByHasband(userId, message_id)
  game.completeHusbandQuestion(roomId)

  await ctx.scene.enter(SCENES.answers)
}

// ------- [ scene ] ------- //

const questionScene = new Scenes.BaseScene<BotContext>(SCENES.question)

questionScene.enter(requestForQuestion)

questionScene.on<GuardTextMessageFn>(
  message('text'),
  checkSendQuestionAvailability,
  handleSendQuestion,
)

export default questionScene
