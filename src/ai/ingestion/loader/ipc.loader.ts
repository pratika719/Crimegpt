import fs from "fs";
import path from "path";
import csv from "csv-parser";

import { Document } from "@langchain/core/documents";

type IPCRow = {
  Description: string;
  Offense: string;
  Punishment: string;
  Section: string;
};

export async function loadIPCDocuments(): Promise<Document[]> {
  const documents: Document[] = [];

  const filePath = path.join(
    process.cwd(),
    "src",
    "data",
    "ipc_sections.csv"
  );

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (row: IPCRow) => {
        try {
          const document = new Document({
            pageContent: `
IPC Section: ${row.Section}

Offense:
${row.Offense}

Punishment:
${row.Punishment}

Description:
${row.Description}
            `.trim(),

            metadata: {
              section: row.Section,
              offense: row.Offense,
              punishment: row.Punishment,
              source: "IPC",
            },
          });

          documents.push(document);
        } catch (error) {
          console.error(
            `Failed to process section ${row.Section}`,
            error
          );
        }
      })
      .on("end", () => {
        console.log(
          `✅ Loaded ${documents.length} IPC sections`
        );

        resolve(documents);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}