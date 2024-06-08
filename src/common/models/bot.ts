export type HusbandRoleAction = 'accept_husband_role' | 'deny_husband_role'

export type CommandTrigger =
  | 'start_game'
  | 'start_game_now'
  | 'stop_game'
  | 'extend_game'
  | 'help'

export type ActionTrigger =
  | 'participate'
  | HusbandRoleAction
  | 'skip_elimination'

export type BotCommand = {
  command: CommandTrigger
  description: string
}
