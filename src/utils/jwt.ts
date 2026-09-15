import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { UserRole } from "../models/User";

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

export function signToken(payload: AuthTokenPayload, expiresIn?: string): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: (expiresIn ?? env.jwtExpiresIn) as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
