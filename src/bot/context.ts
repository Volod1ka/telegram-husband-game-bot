import type { Message, Update } from '@telegraf/types'
import type { Context, NarrowedContext, Scenes, session } from 'telegraf'

export type BotContext = Context & {
  scene: Scenes.SceneContextScene<BotContext>
}

export type ActionContext = NarrowedContext<
  BotContext,
  Update.CallbackQueryUpdate
>
export type CommandContext = NarrowedContext<BotContext, Update.MessageUpdate>
export type TextMessageContext = NarrowedContext<
  BotContext,
  Update.MessageUpdate<Message.TextMessage>
>
export type NextContext = () => Promise<void>

export type SessionOptions = Parameters<
  typeof session<Scenes.SceneSession, BotContext, 'session'>
>[0]
