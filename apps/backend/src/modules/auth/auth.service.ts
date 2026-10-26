import { eq, and } from "drizzle-orm";
import { db } from "../../db/client";
import { stores, users, refreshTokens } from "../../db/schema";
import { hashPassword, verifyPassword } from "./password";
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_EXPIRY_MS,
} from "./tokens";
import type { RegisterInput, LoginInput } from "./auth.schema";

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function registerStoreAndOwner(input: RegisterInput) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });
  if (existing) {
    throw new AuthError("An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(input.password);

  return db.transaction(async (tx) => {
    const [store] = await tx.insert(stores).values({ name: input.storeName }).returning();
    const [user] = await tx
      .insert(users)
      .values({
        storeId: store.id,
        email: input.email,
        passwordHash,
        role: "owner",
      })
      .returning();

    return { store, user };
  });
}

export async function loginWithCredentials(input: LoginInput) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const passwordValid = await verifyPassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const accessToken = signAccessToken({
    userId: user.id,
    storeId: user.storeId,
    role: user.role,
  });

  const refreshTokenPlain = generateRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshTokenPlain),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });

  return { accessToken, refreshTokenPlain, user };
}

export async function refreshSession(refreshTokenPlain: string) {
  const tokenHash = hashRefreshToken(refreshTokenPlain);

  const tokenRecord = await db.query.refreshTokens.findFirst({
    where: and(eq(refreshTokens.tokenHash, tokenHash), eq(refreshTokens.revoked, false)),
  });

  if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
    throw new AuthError("Session expired. Please log in again.", "INVALID_REFRESH_TOKEN");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, tokenRecord.userId),
  });

  if (!user) {
    throw new AuthError("Session expired. Please log in again.", "INVALID_REFRESH_TOKEN");
  }

  // Rotate: revoke the old refresh token, issue a brand new one.
  // This limits how long a stolen refresh token stays useful even if
  // logout never happens — each refresh invalidates the previous token.
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.id, tokenRecord.id));

  const newAccessToken = signAccessToken({ userId: user.id, storeId: user.storeId, role: user.role });
  const newRefreshTokenPlain = generateRefreshToken();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashRefreshToken(newRefreshTokenPlain),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });

  return { accessToken: newAccessToken, refreshTokenPlain: newRefreshTokenPlain, user };
}

export async function revokeRefreshToken(refreshTokenPlain: string) {
  const tokenHash = hashRefreshToken(refreshTokenPlain);
  await db.update(refreshTokens).set({ revoked: true }).where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function updateUserPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) {
    throw new AuthError("User not found.", "USER_NOT_FOUND");
  }

  const isValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AuthError("Current password is incorrect.", "INVALID_CREDENTIALS");
  }

  const newHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({
      passwordHash: newHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function listStoreTeam(storeId: string) {
  const team = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.storeId, storeId));
  return team;
}

export async function createCashierAccount(storeId: string, email: string, password: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.trim().toLowerCase()),
  });
  if (existing) {
    throw new AuthError("An account with this email already exists.", "EMAIL_TAKEN");
  }

  const passwordHash = await hashPassword(password);
  const [cashier] = await db
    .insert(users)
    .values({
      storeId,
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "cashier",
    })
    .returning({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    });

  return cashier;
}

export async function removeCashierAccount(storeId: string, userId: string) {
  const targetUser = await db.query.users.findFirst({
    where: and(eq(users.id, userId), eq(users.storeId, storeId)),
  });

  if (!targetUser) {
    throw new AuthError("User not found.", "USER_NOT_FOUND");
  }

  if (targetUser.role === "owner") {
    throw new AuthError("Store Owners cannot be deleted.", "FORBIDDEN");
  }

  await db.delete(users).where(eq(users.id, userId));
  return { id: userId, email: targetUser.email };
}
