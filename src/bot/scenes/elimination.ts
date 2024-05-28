import { SCENES } from '@constants'
import game from '@game/engine'
import { Scenes } from 'telegraf'
import type { BotContext } from '../context'

// ------- [ commands ] ------- //

// ------- [ actions ] ------- //

// ------- [ Scene ] ------- //

const eliminationScene = new Scenes.BaseScene<BotContext>(SCENES.elimination)

eliminationScene.enter(async ctx => {
  if (!ctx.from) return ctx.scene.reset()

  const currentRoom = game.getRoomOfUser(ctx.from.id)

  if (!currentRoom) return ctx.scene.reset() // TODO: ops не вдалось створити кімнату

  await ctx.scene.reset()

  const [roomId] = currentRoom
  const deletedRoom = game.closeRoom(roomId, true)

  if (deletedRoom) {
    await ctx.telegram.sendMessage(roomId, '[Тест] Гра завершена!')
  }
})

export default eliminationScene
