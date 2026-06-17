-- Enable Row Level Security on all public tables to prevent unauthorized access via Supabase API
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CodeSnippet" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Embedding" ENABLE ROW LEVEL SECURITY;
