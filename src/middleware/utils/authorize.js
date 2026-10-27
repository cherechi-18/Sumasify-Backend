import { AppError } from "./AppError.js";

/**
 * Restrict a route to one or more authenticated application roles.
 * Authentication must run before this middleware.
 */
export function authorizeRoles(...allowedRoles) {
  const normalizedRoles = allowedRoles.map((role) => role.toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", 401, "UNAUTHORIZED")
      );
    }

    if (!normalizedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You do not have permission to perform this action",
          403,
          "FORBIDDEN"
        )
      );
    }

    next();
  };
}
