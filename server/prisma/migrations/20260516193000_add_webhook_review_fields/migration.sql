ALTER TABLE "User"
ADD COLUMN "connectedRepo" TEXT,
ADD COLUMN "webhookId" TEXT;

ALTER TABLE "Review"
ADD COLUMN "source" TEXT NOT NULL DEFAULT 'manual';
