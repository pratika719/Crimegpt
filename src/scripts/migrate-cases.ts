import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    const casesCount = await prisma.case.count();
    console.log(`🔍 Found ${casesCount} cases in the database.`);

    if (casesCount === 0) {
      console.log("✅ No cases in the database. No migration needed.");
      process.exit(0);
    }

    // 1. Check if default user exists
    let defaultUser = await prisma.user.findUnique({
      where: { email: "system-investigator@crimegpt.local" },
    });

    if (!defaultUser) {
      console.log("👤 Creating default System Investigator user...");
      defaultUser = await prisma.user.create({
        data: {
          email: "system-investigator@crimegpt.local",
          name: "System Investigator",
        },
      });
      console.log(`✅ Default user created: ${defaultUser.id}`);
    } else {
      console.log(`👤 Default user already exists: ${defaultUser.id}`);
    }

    // 2. Assign all cases to the default user
    console.log("⚙️ Migrating cases to default user...");
    const updateResult = await prisma.case.updateMany({
      where: {
        userId: null,
      },
      data: {
        userId: defaultUser.id,
      },
    });

    console.log(`✅ Migration complete. Scoped ${updateResult.count} cases to user: ${defaultUser.id}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

main();
