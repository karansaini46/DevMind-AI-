import { prisma } from "../lib/prisma";
import { AppError } from "../utils/app-error";
import { createDocumentation } from "./workflow";

export async function createOrGetDocumentation(userId: string, snippetId: string) {
  const snippet = await prisma.codeSnippet.findFirst({
    where: {
      id: snippetId,
      userId,
    },
    select: {
      id: true,
      filename: true,
      rawCode: true,
      documentation: true,
    },
  });

  if (!snippet) {
    throw new AppError("Snippet not found", 404);
  }

  if (snippet.documentation) {
    return snippet.documentation;
  }

  const generated = await createDocumentation({
    code: snippet.rawCode,
    filename: snippet.filename,
  });

  return prisma.documentation.upsert({
    where: {
      snippetId: snippet.id,
    },
    update: {},
    create: {
      snippetId: snippet.id,
      ...generated,
    },
  });
}

export async function getDocumentation(userId: string, snippetId: string) {
  const snippet = await prisma.codeSnippet.findFirst({
    where: {
      id: snippetId,
      userId,
    },
    select: {
      documentation: true,
    },
  });

  if (!snippet) {
    throw new AppError("Snippet not found", 404);
  }

  if (!snippet.documentation) {
    throw new AppError("Documentation not found", 404);
  }

  return snippet.documentation;
}
