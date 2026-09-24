import { ZodError } from "zod";

export function errorHandler(err, req, res, next) {
  // 1. Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        fields: err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  // 2. AppError / expected application errors
  if (err.status && err.code) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.fields && { fields: err.fields }),
      },
    });
  }

  // 3. Unexpected errors
  console.error(err);

  return res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred",
    },
  });
}