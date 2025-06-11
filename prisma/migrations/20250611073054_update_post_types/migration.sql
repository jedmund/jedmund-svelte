-- Update existing postType values
UPDATE "Post" SET "postType" = 'essay' WHERE "postType" = 'blog';
UPDATE "Post" SET "postType" = 'post' WHERE "postType" = 'microblog';