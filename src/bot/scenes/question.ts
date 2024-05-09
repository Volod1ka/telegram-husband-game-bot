import { INLINE_KEYBOARD_CHAT_WITH_BOT, SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import { getRandomEmoji } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type { BotContext, NextContext, TextMessageContext } from '../context'

// ------- [ enter ] ------- //

const requestForQuestion = async (ctx: BotContext) => {
  let chatId = ctx.chat!.id

  if (ctx.chat?.type === 'private') {
    const currentRoom = game.getRoomOfUser(ctx.chat.id)

    if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

    chatId = currentRoom[0]
  }

  const husband = game.getHusbandInRoom(chatId)

  if (!husband) return

  await ctx.telegram.sendMessage(husband[0], t('husband.question'), {
    parse_mode: 'MarkdownV2',
  })
}

// ------- [ text messages ] ------- //

const checkSendQuestionAvailability = async (
  ctx: TextMessageContext,
  next: NextContext,
) => {
  if (ctx.chat.type !== 'private') return

  if (!game.isHusbandRole(ctx.message.from.id)) return ctx.react('🤷‍♀')

  return next()
}

const onSendQuestion = async (ctx: TextMessageContext) => {
  const userId = ctx.message.from.id
  const [roomId] = game.getRoomOfUser(userId)!

  await ctx.react(getRandomEmoji())
  const { message_id } = await ctx.telegram.sendMessage(
    roomId,
    t('husband.send_question', { question: ctx.message.text }),
    {
      parse_mode: 'HTML',
      reply_markup: INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username)
        .reply_markup,
    },
  )

  game.setQuestionByHasband(userId, {
    message_id,
    text: ctx.message.text,
  })
  game.completeHusbandQuestion(roomId)

  await ctx.scene.enter(SCENES.answers)
}

// ------- [ Scene ] ------- //

const questionScene = new Scenes.BaseScene<BotContext>(SCENES.question)

questionScene.enter(requestForQuestion)

questionScene.on(
  message('text'),
  async (ctx, next) => checkSendQuestionAvailability(ctx, next),
  async ctx => onSendQuestion(ctx),
)

export default questionScene
