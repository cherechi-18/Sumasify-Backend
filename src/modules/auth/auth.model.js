import prisma from "../../config/prisma.js";

export function findUserByEmail(email) {
  return prisma.user.findUnique({where: { email }});
}

export function findUserByGoogleId(googleId) {
  return prisma.user.findUnique({
    where: { googleId },
  });
}

export function findUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    include: {vendor: true}});
}

export function createUser(data) {
  return prisma.user.create({data});
}

export function linkGoogleAccount(userId, googleId) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      googleId,
    },
  });
}

export function updateLastLogin(userId) {
  return prisma.user.update({
    where: { id: userId },
    data: {lastLoginAt: new Date() }});
}

export function updatePassword(userId, passwordHash) {
  return prisma.user.update({
    where: { id: userId },
    data: {passwordHash}});
}

export function updateAccountStatus(userId, accountStatus) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus,
    },
  });
}

export function findUserAccountStatusById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      accountStatus: true,
      role: true,
    },
  });
}

export function createRefreshSession(data) {
  return prisma.refreshSession.create({
    data,
  });
}

export function findRefreshSessionByTokenHash(tokenHash) {
  return prisma.refreshSession.findUnique({
    where: { tokenHash },
  });
}

export function revokeRefreshSession(id) {
  return prisma.refreshSession.update({
    where: { id },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function revokeAllRefreshSessionsByUserId(userId) {
  return prisma.refreshSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export function rotateRefreshSession({
  tokenHash,
  newTokenHash,
  expiresAt,
  userAgent = null,
  ipHash = null,
}) {
  return prisma.$transaction(async (tx) => {
    // Lock the existing refresh session.
    const sessions = await tx.$queryRaw`
      SELECT
        id,
        user_id AS "userId",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt"
      FROM refresh_sessions
      WHERE token_hash = ${tokenHash}
      FOR UPDATE
    `;

    const session = sessions[0];

    if (!session) {
      const err = new Error("Refresh session not found");
      err.code = "REFRESH_SESSION_NOT_FOUND";
      throw err;
    }

    if (session.revokedAt) {
      const err = new Error("Refresh session has already been revoked");
      err.code = "REFRESH_SESSION_REVOKED";
      throw err;
    }

    if (session.expiresAt <= new Date()) {
      const err = new Error("Refresh session has expired");
      err.code = "REFRESH_SESSION_EXPIRED";
      throw err;
    }

    // Revoke the old session.
    await tx.refreshSession.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    // Create the replacement session.
    const newSession = await tx.refreshSession.create({
      data: {
        userId: session.userId,
        tokenHash: newTokenHash,
        expiresAt,
        userAgent,
        ipHash,
      },
    });

    return newSession;
  });
}

export function findPasswordResetTokenByHash(tokenHash) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
}

export function deletePasswordResetTokensByUserId(userId) {
  return prisma.passwordResetToken.deleteMany({
    where: {
      userId,
    },
  });
}

export function createPasswordResetToken(data) {
  return prisma.passwordResetToken.create({
    data,
  });
}

export function markPasswordResetTokenAsUsed(id) {
  return prisma.passwordResetToken.update({
    where: { id },
    data: {
      usedAt: new Date(),
    },
  });
}


