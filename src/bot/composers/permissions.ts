import { t } from '@i18n'
import { store } from '@stores'
import { hasAllPermissions, hasCommand } from '@tools/utils'
import { Composer } from 'telegraf'
import { message } from 'telegraf/filters'
import type { BotContext, ContextFn } from '../context'

// ------- [ context ] ------- //

const handlePermissions: ContextFn = async (ctx, next) => {
  if (
    ctx.chat?.type !== 'private' &&
    (ctx.has('my_chat_member') ||
      (ctx.has(message('text')) && hasCommand(ctx.message.text)))
  ) {
    const botInfo = await ctx.getChatMember(ctx.botInfo.id)

    if (botInfo.status !== 'administrator' || !hasAllPermissions(botInfo)) {
      store.feedbackStore.setShownHasAdminRights(false)
      return ctx.replyWithHTML(t('warning.admin_rights.deny'))
    }

    if (!store.feedbackStore.shownHasAdminRights) {
      store.feedbackStore.setShownHasAdminRights(true)
      await ctx.replyWithHTML(t('warning.admin_rights.accept'))
    }
  }

  return next()
}

// ------- [ composer ] ------- //

const composer = new Composer<BotContext>()

composer.use(handlePermissions)

export default composer
