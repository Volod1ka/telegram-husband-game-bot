import { SCENES } from '@constants'
import game from '@game/engine'
import { t } from '@i18n'
import {
  formattedChatTitleForHTML,
  mentionWithHTML,
  remainsTime,
} from '@tools/formatting'
import { createMessageLink, handleCatch } from '@tools/utils'
import { Scenes } from 'telegraf'
import type { BotContext, ContextFn } from '../context'

// ------- [ bot context ] ------- //

const finishGame: ContextFn = async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  const [roomId, { startDate, participants }] = currentRoom
  const chat = await ctx.telegram.getChat(roomId)
  const chatTitle = formattedChatTitleForHTML(chat)

  const roomMessage = t('finished.chat', {
    chat_title: chatTitle,
    time: remainsTime(startDate, Date.now()),
  })

  const { message_id } = await ctx.telegram.sendMessage(roomId, roomMessage, {
    parse_mode: 'HTML',
  })

  for (const [participantId, { user }] of participants) {
    await ctx.telegram
      .sendMessage(
        participantId,
        t('finished.personal', {
          chat_title: chatTitle,
          user: mentionWithHTML(user),
          link: createMessageLink(chat.id, message_id),
        }),
        { parse_mode: 'HTML' },
      )
      .catch(error => handleCatch(error, ctx))
  }

  game.closeRoom(roomId)
  ctx.scene.reset()
}

// ------- [ scene ] ------- //

const finishedScene = new Scenes.BaseScene<BotContext>(SCENES.finished)

finishedScene.enter(finishGame)

export default finishedScene
