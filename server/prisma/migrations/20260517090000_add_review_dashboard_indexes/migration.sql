CREATE INDEX "CodeSnippet_userId_language_idx" ON "CodeSnippet"("userId", "language");

CREATE INDEX "Review_userId_createdAt_idx" ON "Review"("userId", "createdAt");

CREATE INDEX "Review_userId_score_idx" ON "Review"("userId", "score");

CREATE INDEX "Review_userId_source_createdAt_idx" ON "Review"("userId", "source", "createdAt");
