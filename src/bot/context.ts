import type { Update } from '@telegraf/types'
import type { Context, NarrowedContext, Scenes } from 'telegraf'

export type BotContext = Context & {
  scene: Scenes.SceneContextScene<BotContext>
}

export type ActionContext = NarrowedContext<
  BotContext,
  Update.CallbackQueryUpdate
>
export type CommandContext = NarrowedContext<BotContext, Update.MessageUpdate>
export type NextContext = () => Promise<void>
