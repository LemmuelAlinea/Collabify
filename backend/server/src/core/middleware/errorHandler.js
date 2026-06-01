export function notFoundHandler(_req, _res, next) {
  next({
    statusCode: 404,
    message: 'Route not found',
  })
}

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500

  res.status(statusCode).json({
    error: {
      message: statusCode === 500 ? 'Internal server error' : error.message,
      details: error.details,
    },
  })
}
