# Debug Photos Display

This directory contains tools to debug why photos aren't appearing on the photos page.

## API Test Endpoint

Visit the following URL in your browser while the dev server is running:
```
http://localhost:5173/api/test-photos
```

This endpoint will return detailed information about:
- All photos with showInPhotos=true and albumId=null
- Status distribution of these photos
- Raw SQL query results
- Comparison with what the /api/photos endpoint expects

## Database Query Script

Run the following command to query the database directly:
```bash
npx tsx scripts/test-photos-query.ts
```

This script will show:
- Total photos in the database
- Photos matching the criteria (showInPhotos=true, albumId=null)
- Status distribution
- Published vs draft photos
- All unique status values in the database

## What to Check

1. **Status Values**: The main photos API expects `status='published'`. Check if your photos have this status.
2. **showInPhotos Flag**: Make sure photos have `showInPhotos=true`
3. **Album Association**: Photos should have `albumId=null` to appear as individual photos

## Common Issues

- Photos might be in 'draft' status instead of 'published'
- Photos might have showInPhotos=false
- Photos might be associated with an album (albumId is not null)