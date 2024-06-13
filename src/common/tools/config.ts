import { config } from 'dotenv'
import 'dotenv/config'

export type NodeConfig = {
  BOT_TOKEN?: string
  ENV?: 'development' | 'production'
}

config({ path: `.env.${process.env['NODE_ENV']}` })

export default process.env as NodeConfig
