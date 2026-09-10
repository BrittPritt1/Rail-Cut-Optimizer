import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export const ADMIN_SESSION_COOKIE = "rail_cut_admin";

function sessionToken(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET must be configured");
  }

  return createHmac("sha256", secret).update("rail-cut-admin").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function isAdminSession(req: Request): boolean {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  return typeof token === "string" && safeEqual(token, sessionToken());
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!isAdminSession(req)) {
    res.status(401).json({ error: "Admin access required" });
    return;
  }

  next();
}

export function isValidAdminPin(pin: string): boolean {
  const configuredPin = process.env.ADMIN_PIN;
  return typeof configuredPin === "string" && safeEqual(pin, configuredPin);
}

export function setAdminSession(res: Response): void {
  res.cookie(ADMIN_SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminSession(res: Response): void {
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}