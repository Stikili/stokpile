/**
 * DEPRECATED — no longer used.
 *
 * The application has been migrated from a single KV-store table
 * to a fully normalised PostgreSQL schema defined in:
 *
 *   supabase/migrations/20260326000000_proper_schema.sql
 *
 * All database access now goes through the Supabase JS client
 * directly inside index.ts using proper relational tables with
 * Row Level Security policies.
 *
 * This file is kept only to avoid breaking any tooling that
 * scans the directory. It can be deleted once you have
 * confirmed the migration is complete.
 */
export {};
