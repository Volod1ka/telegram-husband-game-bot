import { INLINE_KEYBOARD_CHAT_WITH_BOT, SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import { capitalizeFirstLetter } from '@tools/formatting'
import { getRandomEmoji } from '@tools/utils'
import { Scenes } from 'telegraf'
import { message } from 'telegraf/filters'
import type {
  BotContext,
  ContextFn,
  GuardTextMessageFn,
  TextMessageFn,
} from '../context'

// ------- [ bot context ] ------- //

const requestForQuestion: ContextFn = async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [chatId] = currentRoom
  const husband = game.getHusbandInGame(chatId)

  if (!husband) return

  await ctx.telegram.sendMessage(husband[0], t('husband.question'), {
    parse_mode: 'HTML',
  })
}

// ------- [ text message ] ------- //

const checkSendQuestionAvailability: TextMessageFn = async (ctx, next) => {
  if (ctx.chat.type !== 'private') return

  if (!game.isHusbandRole(ctx.message.from.id)) return ctx.react('👨‍💻')

  return next()
}

const onSendQuestion: TextMessageFn = async ctx => {
  const userId = ctx.message.from.id
  const [roomId] = game.getRoomOfUser(userId)!
  const textMessage = t('husband.send_question', {
    question: capitalizeFirstLetter(ctx.message.text),
  })

  const [, { message_id }] = await Promise.all([
    ctx.react(getRandomEmoji()),
    ctx.telegram.sendMessage(roomId, textMessage, {
      parse_mode: 'HTML',
      reply_markup: INLINE_KEYBOARD_CHAT_WITH_BOT(ctx.botInfo.username)
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
  onSendQuestion,
)

export default questionScene
