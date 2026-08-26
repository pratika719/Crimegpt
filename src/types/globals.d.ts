/**
 * globals.d.ts — Module augmentations & globalThis declarations
 *
 * This file augments third-party module types so that project-wide
 * accessors (session.user.id, req.auth, global singletons) are fully
 * typed without unsafe casts.
 */

import type { DefaultSession } from "next-auth";
import type { Pool } from "pg";
import type IORedis from "ioredis";
import type { PrismaClient } from "@/generated/prisma/client";

// ============================================================================
// NextAuth — Session & User augmentation
// ============================================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}

// ============================================================================
// Next.js — Middleware request augmentation
// ============================================================================

declare module "next" {
  interface NextRequest {
    auth?: {
      user?: {
        id: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
      };
    } | null;
  }
}

// ============================================================================
// GlobalThis — Singleton instances (dev-safe)
// ============================================================================

declare global {
  // Prisma client singleton (preserved across HMR in development)
  var prismaGlobal: PrismaClient | undefined;

  // Shared pg Pool singleton (avoids connection leaks on managed Postgres)
  var pgPoolGlobal: Pool | undefined;

  // IORedis connection singleton
  var redisConnection: IORedis | undefined;
}

export {};
