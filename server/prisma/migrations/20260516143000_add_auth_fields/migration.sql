ALTER TABLE "User"
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL,
ADD COLUMN "githubAccessToken" TEXT,
ADD COLUMN "githubUsername" TEXT,
ADD COLUMN "githubAvatarUrl" TEXT;
