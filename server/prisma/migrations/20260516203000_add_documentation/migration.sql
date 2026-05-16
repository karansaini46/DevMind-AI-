CREATE TABLE "Documentation" (
    "id" UUID NOT NULL,
    "snippetId" UUID NOT NULL,
    "commentedCode" TEXT NOT NULL,
    "readmeSection" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documentation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Documentation_snippetId_key" ON "Documentation"("snippetId");

ALTER TABLE "Documentation"
ADD CONSTRAINT "Documentation_snippetId_fkey"
FOREIGN KEY ("snippetId") REFERENCES "CodeSnippet"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
