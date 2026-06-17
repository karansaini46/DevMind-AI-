-- Create the extensions schema if it doesn't exist (e.g., for local development)
CREATE SCHEMA IF NOT EXISTS "extensions";

-- Move the vector extension from the public schema to the extensions schema
-- This resolves the Supabase Security Advisor warning about extensions in the public schema
ALTER EXTENSION vector SET SCHEMA "extensions";
