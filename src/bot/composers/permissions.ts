import { t } from '@i18n'
import { hasAllPermissions, hasCommand } from '@tools/utils'
import { Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import type { BotContext, ContextFn } from '../context'

// ------- [ variables ] ------- //

// TODO: Reduce Global State
let shownHasAdminRights = true

// ------- [ context ] ------- //

const handlePermissions: ContextFn = async (ctx, next) => {
  if (
    ctx.chat?.type !== 'private' &&
    (ctx.has('my_chat_member') ||
      (ctx.has(message('text')) && hasCommand(ctx.message.text)))
  ) {
    const botInfo = await ctx.getChatMember(ctx.botInfo.id)

    if (botInfo.status !== 'administrator' || !hasAllPermissions(botInfo)) {
      shownHasAdminRights = false
      return ctx.replyWithHTML(t('warning.admin_rights.deny'))
    }

    if (!shownHasAdminRights) {
      shownHasAdminRights = true
      await ctx.replyWithHTML(t('warning.admin_rights.accept'))
    }
  }

  return next()
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.use(handlePermissions)

export default composer
