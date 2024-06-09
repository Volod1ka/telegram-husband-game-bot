import type { CallbackQuery, Message, Update } from '@telegraf/types'
import type {
  Context,
  MiddlewareFn,
  NarrowedContext,
  Scenes,
  session,
} from 'telegraf'
import type { Guard } from 'telegraf/typings/core/helpers/util'

// ------- [ bot context ] ------- //

export type BotContext<U extends Update = Update> = Context<U> & {
  scene: Scenes.SceneContextScene<BotContext>
}

// ------- [ context update ] ------- //

export type TextMessageUpdate = Update.MessageUpdate<Message.TextMessage>
export type CallbackQueryDataUpdate =
  Update.CallbackQueryUpdate<CallbackQuery.DataQuery>

// ------- [ narrowed context ] ------- //

export type ActionContext = NarrowedContext<
  BotContext,
  Update.CallbackQueryUpdate
>
export type CommandContext = NarrowedContext<BotContext, Update.MessageUpdate>
export type TextMessageContext = NarrowedContext<BotContext, TextMessageUpdate>
export type CallbackQueryDataContext = NarrowedContext<
  BotContext,
  CallbackQueryDataUpdate
>
export type NextContext = Parameters<ContextFn>[1]

// ------- [ middleware function ] ------- //

export type ContextFn = MiddlewareFn<BotContext>
export type ActionFn = MiddlewareFn<ActionContext>
export type CommandFn = MiddlewareFn<CommandContext>
export type TextMessageFn = MiddlewareFn<TextMessageContext>
export type CallbackQueryDataFn = MiddlewareFn<CallbackQueryDataContext>

// ------- [ guard middleware function ] ------- //

export type GuardTextMessageFn = Guard<Update, TextMessageUpdate>
export type GuardCallbackQueryDataFn = Guard<Update, CallbackQueryDataUpdate>

export type SessionOptions = Parameters<
  typeof session<Scenes.SceneSession, BotContext, 'session'>
>[0]
