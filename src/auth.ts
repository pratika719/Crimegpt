import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

// Robust backend environment validation and sanitization for AUTH_URL
if (process.env.AUTH_URL) {
  try {
    // Validate if the URL is complete and parses correctly
    new URL(process.env.AUTH_URL);
  } catch (err) {
    console.warn(`⚠️ [auth] Invalid process.env.AUTH_URL: "${process.env.AUTH_URL}". Attempting to sanitize...`);
    
    // Check if it's simply missing a protocol (e.g. "crimegpt-kappa.vercel.app")
    if (!/^https?:\/\//i.test(process.env.AUTH_URL)) {
      const isLocal = process.env.AUTH_URL.includes("localhost") || process.env.AUTH_URL.includes("127.0.0.1");
      const protocol = isLocal ? "http://" : "https://";
      const sanitized = `${protocol}${process.env.AUTH_URL}`;
      
      try {
        new URL(sanitized);
        process.env.AUTH_URL = sanitized;
        console.log(`✅ [auth] Sanitized AUTH_URL to: "${sanitized}"`);
      } catch {
        console.error(`❌ [auth] Failed to sanitize AUTH_URL. Deleting from environment to let Auth.js auto-detect.`);
        delete process.env.AUTH_URL;
      }
    } else {
      console.error(`❌ [auth] Deleting invalid AUTH_URL from environment to let Auth.js auto-detect.`);
      delete process.env.AUTH_URL;
    }
  }
}

// In local development, bypass production AUTH_URL to prevent redirect mismatches during OAuth
if (process.env.NODE_ENV === "development" && process.env.AUTH_URL) {
  const isLocal = process.env.AUTH_URL.includes("localhost") || process.env.AUTH_URL.includes("127.0.0.1");
  if (!isLocal) {
    console.warn(
      `⚠️ [auth] AUTH_URL is set to a remote domain ("${process.env.AUTH_URL}") in development. ` +
      `Bypassing AUTH_URL to let Auth.js auto-detect localhost.`
    );
    delete process.env.AUTH_URL;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  // events: {
  //   async signIn({ user }) {
  //     if (user?.id) {
  //       try {
  //         // Check if there are cases belonging to the default system user
  //         const systemUser = await prisma.user.findUnique({
  //           where: { email: "system-investigator@crimegpt.local" },
  //         });

  //         if (systemUser && systemUser.id !== user.id) {
  //           // Transfer all cases from the system user to the logged-in user
  //           const updateResult = await prisma.case.updateMany({
  //             where: { userId: systemUser.id },
  //             data: { userId: user.id },
  //           });
  //           if (updateResult.count > 0) {
  //             console.log(`[Auth] Transferred ${updateResult.count} cases from system-investigator to logged-in user: ${user.id}`);
  //           }
  //         }
  //       } catch (error) {
  //         console.error("[Auth] Error transferring cases on signIn:", error);
  //       }
  //     }
  //   },
  // },
});
