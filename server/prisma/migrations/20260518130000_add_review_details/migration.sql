ALTER TABLE "Review"
ADD COLUMN "structuredFeedback" JSONB,
ADD COLUMN "demoScore" DOUBLE PRECISION,
ADD COLUMN "productionScore" DOUBLE PRECISION,
ADD COLUMN "confidenceLevel" TEXT,
ADD COLUMN "mode" TEXT,
ADD COLUMN "inputTokens" INTEGER,
ADD COLUMN "outputTokens" INTEGER,
ADD COLUMN "totalTokens" INTEGER;
