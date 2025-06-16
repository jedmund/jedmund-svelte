# Cloudinary Management Guide

This guide explains how to manage and audit your Cloudinary files to prevent orphaned files that aren't referenced in your database.

## Overview

The Cloudinary management system provides:

- Audit functionality to identify orphaned files
- Cleanup scripts with dry-run and execute modes
- API endpoints for admin UI integration
- Detailed reporting of storage usage

## Command Line Usage

### Running an Audit (Dry Run)

To see what files would be deleted without actually deleting them:

```bash
npm run tsx scripts/cloudinary-cleanup.ts
```

This will:

- List all files in your Cloudinary account
- Check all database references
- Identify orphaned files (in Cloudinary but not in database)
- Show total storage being wasted
- Identify missing files (in database but not in Cloudinary)

### Running with Verbose Output

To see detailed information about each orphaned file:

```bash
npm run tsx scripts/cloudinary-cleanup.ts --verbose
```

### Executing Cleanup

To actually delete orphaned files:

```bash
npm run tsx scripts/cloudinary-cleanup.ts --execute
```

This will prompt for confirmation before deleting files.

## API Usage

### Get Audit Report

```bash
GET /api/admin/cloudinary-audit
```

Returns:

```json
{
  "summary": {
    "totalCloudinaryFiles": 1234,
    "totalDatabaseReferences": 1200,
    "orphanedFilesCount": 34,
    "orphanedFilesSize": 12582912,
    "orphanedFilesSizeFormatted": "12 MB",
    "missingReferencesCount": 2
  },
  "orphanedFiles": [...],
  "missingReferences": [...]
}
```

### Delete Orphaned Files

```bash
DELETE /api/admin/cloudinary-audit
Content-Type: application/json

{
  "publicIds": ["folder/file1", "folder/file2"],
  "dryRun": false
}
```

## How It Works

### 1. Cloudinary Scanning

- Uses Cloudinary API to fetch all uploaded resources
- Handles pagination for large collections
- Extracts public IDs for comparison

### 2. Database Scanning

Checks for Cloudinary URLs in:

- `Media` table: `url` and `thumbnailUrl` fields
- `Project` table: `featuredImage`, `logoUrl`, and `gallery` JSON
- `Post` table: `featuredImage` and `attachments` JSON
- `Album` references through `AlbumMedia` relation

### 3. Comparison Logic

- Orphaned files: Exist in Cloudinary but not referenced in database
- Missing files: Referenced in database but don't exist in Cloudinary
- Thumbnails with `_thumbnail_` pattern are automatically excluded

### 4. Cleanup Process

- Supports batch deletion with rate limiting
- Provides detailed success/failure reporting
- Includes safety checks and confirmation prompts

## Best Practices

1. **Regular Audits**: Run audits monthly to identify issues early
2. **Dry Run First**: Always run in dry-run mode before executing deletions
3. **Backup References**: Consider exporting audit results before cleanup
4. **Monitor Failed Uploads**: Track missing references to identify upload issues

## Troubleshooting

### Common Issues

1. **Authentication Errors**

   - Ensure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set
   - Check that your API credentials have appropriate permissions

2. **Rate Limiting**

   - The script handles pagination automatically
   - For large deletions, the API limits to 100 files per request

3. **Missing References**
   - These indicate database entries pointing to non-existent Cloudinary files
   - May be caused by failed uploads or manual Cloudinary deletions
   - Consider implementing database cleanup for these entries
