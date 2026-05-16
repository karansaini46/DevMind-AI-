import { embedAndStore } from "../embeddings/service";
import { prisma } from "../lib/prisma";

const batchSize = 25;

async function main() {
  let indexed = 0;
  let failed = 0;
  let cursor: string | undefined;

  while (true) {
    const snippets = await prisma.codeSnippet.findMany({
      where: {
        ...(cursor
          ? {
              id: {
                gt: cursor,
              },
            }
          : {}),
        embeddings: {
          none: {},
        },
      },
      orderBy: {
        id: "asc",
      },
      select: {
        id: true,
        rawCode: true,
      },
      take: batchSize,
    });

    if (snippets.length === 0) {
      break;
    }

    for (const snippet of snippets) {
      try {
        await embedAndStore(snippet.id, snippet.rawCode);
        indexed += 1;
      } catch (error) {
        failed += 1;
        console.error(`Unable to index snippet ${snippet.id}`, error);
      }
    }

    cursor = snippets[snippets.length - 1]?.id;
  }

  console.log(`Indexed ${indexed} snippets`);

  if (failed > 0) {
    console.log(`Failed to index ${failed} snippets`);
  }
}

main()
  .catch((error) => {
    console.error("Embedding backfill failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
