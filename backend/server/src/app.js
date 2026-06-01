import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import { errorHandler, notFoundHandler } from './core/middleware/errorHandler.js'
import { routes } from './routes.js'

export function createApp() {
  const app = express()

  app.use(helmet())
  app.use(cors({
    origin: env.corsOrigin,
    credentials: true,
  }))
  app.use(express.json({ limit: '10mb' }))
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))

  app.use(env.apiBasePath, routes)
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
