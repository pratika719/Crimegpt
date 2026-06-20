import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  try {
    const casesCount = await prisma.case.count();
    console.log(`Cases count in database: ${casesCount}`);
    if (casesCount > 0) {
      const cases = await prisma.case.findMany({ take: 5 });
      console.log("Sample cases:", cases);
    }
  } catch (error) {
    console.error("Error querying cases:", error);
  } finally {
    process.exit(0);
  }
}

main();
