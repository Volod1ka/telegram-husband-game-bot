import { SCENES } from '@constants'
import game from '@game/engine'
import { Scenes } from 'telegraf'
import type { BotContext } from '../context'

// ------- [ commands ] ------- //

// ------- [ actions ] ------- //

// ------- [ Scene ] ------- //

const answersScene = new Scenes.BaseScene<BotContext>(SCENES.answers)

answersScene.enter(async ctx => {
  const currentRoom = game.getRoomOfUser(ctx.from!.id)

  if (!currentRoom) {
    return
  }

  const deletedRoom = game.closeRoom(currentRoom[0], true)

  if (deletedRoom) {
    await ctx.telegram.sendMessage(currentRoom[0], '[Тест] Гра завершена!')
    await ctx.scene.reset()
  }
})

export default answersScene
