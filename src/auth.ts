import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          // Check if there are cases belonging to the default system user
          const systemUser = await prisma.user.findUnique({
            where: { email: "system-investigator@crimegpt.local" },
          });

          if (systemUser && systemUser.id !== user.id) {
            // Transfer all cases from the system user to the logged-in user
            const updateResult = await prisma.case.updateMany({
              where: { userId: systemUser.id },
              data: { userId: user.id },
            });
            if (updateResult.count > 0) {
              console.log(`[Auth] Transferred ${updateResult.count} cases from system-investigator to logged-in user: ${user.id}`);
            }
          }
        } catch (error) {
          console.error("[Auth] Error transferring cases on signIn:", error);
        }
      }
    },
  },
});
