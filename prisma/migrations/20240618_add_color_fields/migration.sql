-- Add color and aspect ratio fields to Media table
ALTER TABLE "public"."Media" ADD COLUMN IF NOT EXISTS "dominantColor" VARCHAR(7);
ALTER TABLE "public"."Media" ADD COLUMN IF NOT EXISTS "colors" JSONB;
ALTER TABLE "public"."Media" ADD COLUMN IF NOT EXISTS "aspectRatio" DOUBLE PRECISION;

-- Add color and aspect ratio fields to Photo table
ALTER TABLE "public"."Photo" ADD COLUMN IF NOT EXISTS "dominantColor" VARCHAR(7);
ALTER TABLE "public"."Photo" ADD COLUMN IF NOT EXISTS "colors" JSONB;
ALTER TABLE "public"."Photo" ADD COLUMN IF NOT EXISTS "aspectRatio" DOUBLE PRECISION;