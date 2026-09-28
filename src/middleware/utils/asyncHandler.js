// Wraps async route handlers so thrown errors reach errorHandler
// instead of crashing the process or needing try/catch in every controller.
export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}