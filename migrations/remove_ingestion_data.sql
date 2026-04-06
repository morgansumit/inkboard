-- Migration: Remove content ingestion data and tables
-- This deletes all mock/ingested posts and drops ingestion-related tables

-- 1. Delete all ingested posts (posts not from real users)
-- Keep only posts where source_platform = 'user' (real user posts)
DELETE FROM posts 
WHERE source_platform IS NULL 
   OR source_platform != 'user';

-- 2. Drop external_sources table (used for tracking ingestion sources)
DROP TABLE IF EXISTS external_sources CASCADE;

-- 3. Drop any other ingestion-related tables if they exist
DROP TABLE IF EXISTS ingestion_logs CASCADE;
DROP TABLE IF EXISTS ingestion_queue CASCADE;

-- 4. Clean up any tags that might be orphaned (optional)
DELETE FROM post_tags 
WHERE post_id NOT IN (SELECT id FROM posts WHERE id IS NOT NULL);

-- 5. Verify remaining posts are only from real users
-- This query should show 0 rows after cleanup
SELECT COUNT(*) as remaining_ingested_posts 
FROM posts 
WHERE source_platform IS NULL OR source_platform != 'user';
