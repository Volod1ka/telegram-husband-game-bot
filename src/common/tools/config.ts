import 'dotenv/config'

export type NodeConfig = {
  BOT_TOKEN?: string
}

export default process.env as NodeConfig
