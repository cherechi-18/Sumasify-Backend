import jwt from "jsonwebtoken";

import { env } from "../../config/env.js";
import { AppError } from "./AppError.js";
import { findUserAccountStatusById } from "../../modules/auth/auth.model.js";

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(
      new AppError(
        "Authentication required",
        401,
        "UNAUTHORIZED"
      )
    );
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(
      new AppError(
        "Authentication required",
        401,
        "UNAUTHORIZED"
      )
    );
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    const user = await findUserAccountStatusById(payload.id);

    if (!user) {
      return next(
        new AppError(
          "User account not found",
          401,
          "UNAUTHORIZED"
        )
      );
    }

    if (user.accountStatus === "SUSPENDED") {
      return next(
        new AppError(
          "This account has been suspended",
          403,
          "ACCOUNT_SUSPENDED"
        )
      );
    }

    if (user.accountStatus === "DEACTIVATED") {
      return next(
        new AppError(
          "This account has been deactivated",
          403,
          "ACCOUNT_DEACTIVATED"
        )
      );
    }

    req.user = {
      id: user.id,
      role: user.role.toLowerCase(),
    };

    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }

    return next(
      new AppError(
        "Invalid or expired access token",
        401,
        "UNAUTHORIZED"
      )
    );
  }
}