-- Consolidate altText into description
-- If description is null or empty, copy altText value
-- If both exist, keep description (assuming it's more comprehensive)
UPDATE "Media"
SET description = COALESCE(NULLIF(description, ''), "altText")
WHERE "altText" IS NOT NULL AND "altText" != '';

-- Show how many records were affected
SELECT COUNT(*) as updated_records
FROM "Media"
WHERE "altText" IS NOT NULL AND "altText" != '';