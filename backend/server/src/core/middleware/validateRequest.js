import { HttpError } from '../errors/httpError.js'

export function validateBody(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body)

    if (!result.success) {
      next(new HttpError(422, 'Validation failed', result.error.flatten()))
      return
    }

    req.body = result.data
    next()
  }
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.query)

    if (!result.success) {
      next(new HttpError(422, 'Validation failed', result.error.flatten()))
      return
    }

    req.query = result.data
    next()
  }
}
