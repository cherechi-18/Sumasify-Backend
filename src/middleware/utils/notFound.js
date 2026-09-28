import { AppError } from "../utils/AppError.js";

export function notFound(req, res, next) {
  next(
    new AppError(
      `Route not found: ${req.method} ${req.originalUrl}`,
      404,
      "NOT_FOUND"
    )
  );
}