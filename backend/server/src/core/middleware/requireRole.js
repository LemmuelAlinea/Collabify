import { HttpError } from '../errors/httpError.js'

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new HttpError(401, 'Authentication required'))
      return
    }

    if (!allowedRoles.includes(req.auth.role)) {
      next(new HttpError(403, 'You do not have permission to access this resource'))
      return
    }

    next()
  }
}
