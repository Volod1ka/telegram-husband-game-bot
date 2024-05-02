import { SCENES } from '@constants'
import game from '@game/engine'
import { Scenes } from 'telegraf'
import type { BotContext } from '../context'

// ------- [ commands ] ------- //

// ------- [ actions ] ------- //

// ------- [ Scene ] ------- //

const questionScene = new Scenes.BaseScene<BotContext>(SCENES.question)

// ? stress test (undone)
questionScene.enter(async ctx => {
  const currentRoom = game.getRoomOfUser(ctx.from!.id)

  if (!currentRoom) {
    return
  }

  const deleted = game.closeRoom(currentRoom[0], true)

  if (deleted) {
    await ctx.telegram.sendMessage(currentRoom[0], '[Тест] Гра завершена!')
    await ctx.scene.reset()
  }
})

export default questionScene
