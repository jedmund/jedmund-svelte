#!/usr/bin/env tsx

import { config } from 'dotenv'
import { v2 as cloudinary } from 'cloudinary'
import {
	auditCloudinaryResources,
	deleteOrphanedFiles,
	type AuditResult
} from '../src/lib/server/cloudinary-audit'
import { formatBytes } from '../src/lib/utils/format'

// Load environment variables
config()

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET
})

/**
 * Main cleanup script
 */
async function main() {
	const args = process.argv.slice(2)
	const isDryRun = !args.includes('--execute')
	const verbose = args.includes('--verbose')

	console.log('🔍 Cloudinary Cleanup Script')
	console.log('===========================')
	console.log(`Mode: ${isDryRun ? 'DRY RUN' : 'EXECUTE'}`)
	console.log('')

	try {
		// Run audit
		console.log('📊 Running audit...')
		const audit = await auditCloudinaryResources()

		// Display results
		displayAuditResults(audit, verbose)

		// Handle cleanup if orphaned files exist
		if (audit.orphanedFiles.length > 0) {
			console.log('')

			if (isDryRun) {
				console.log('⚠️  DRY RUN MODE: No files will be deleted')
				console.log('   Run with --execute flag to delete orphaned files')
			} else {
				console.log('🗑️  Preparing to delete orphaned files...')
				const confirm = await promptConfirmation(
					`Delete ${audit.orphanedFiles.length} orphaned files (${formatBytes(audit.orphanedTotalBytes)})?`
				)

				if (confirm) {
					const publicIds = audit.orphanedFiles.map((f) => f.public_id)
					const deleteResults = await deleteOrphanedFiles(publicIds, false)

					console.log('')
					console.log('✅ Deletion Results:')
					console.log(`   Attempted: ${deleteResults.attempted}`)
					console.log(`   Succeeded: ${deleteResults.succeeded}`)
					console.log(`   Failed: ${deleteResults.failed.length}`)

					if (deleteResults.failed.length > 0 && verbose) {
						console.log('')
						console.log('❌ Failed deletions:')
						deleteResults.failed.forEach((id) => console.log(`   - ${id}`))
					}
				} else {
					console.log('❌ Cleanup cancelled')
				}
			}
		} else {
			console.log('')
			console.log('✅ No orphaned files found! Your Cloudinary storage is clean.')
		}

		// Handle missing files
		if (audit.missingFromCloudinary.length > 0) {
			console.log('')
			console.log('⚠️  Warning: Database references files missing from Cloudinary')
			console.log(`   Found ${audit.missingFromCloudinary.length} missing references`)
			console.log('   Consider cleaning up these database entries')

			if (verbose) {
				console.log('')
				console.log('Missing public IDs:')
				audit.missingFromCloudinary.forEach((id) => console.log(`   - ${id}`))
			}
		}
	} catch (error) {
		console.error('❌ Error:', error)
		process.exit(1)
	}
}

/**
 * Display audit results in a formatted way
 */
function displayAuditResults(audit: AuditResult, verbose: boolean) {
	console.log('')
	console.log('📈 Audit Summary:')
	console.log(`   Total files in Cloudinary: ${audit.totalCloudinaryFiles}`)
	console.log(`   Total database references: ${audit.totalDatabaseReferences}`)
	console.log(`   Orphaned files: ${audit.orphanedFiles.length}`)
	console.log(`   Orphaned storage size: ${formatBytes(audit.orphanedTotalBytes)}`)
	console.log(`   Missing from Cloudinary: ${audit.missingFromCloudinary.length}`)

	if (verbose && audit.orphanedFiles.length > 0) {
		console.log('')
		console.log('📁 Orphaned Files:')

		// Group by folder
		const byFolder = audit.orphanedFiles.reduce(
			(acc, file) => {
				const folder = file.folder || 'root'
				if (!acc[folder]) acc[folder] = []
				acc[folder].push(file)
				return acc
			},
			{} as Record<string, typeof audit.orphanedFiles>
		)

		Object.entries(byFolder).forEach(([folder, files]) => {
			console.log(`   📂 ${folder}/ (${files.length} files)`)
			files.forEach((file) => {
				console.log(`      - ${file.public_id} (${formatBytes(file.bytes)})`)
			})
		})
	}
}

/**
 * Prompt for user confirmation
 */
async function promptConfirmation(message: string): Promise<boolean> {
	console.log('')
	console.log(`❓ ${message} (y/N): `)

	return new Promise((resolve) => {
		process.stdin.once('data', (data) => {
			const answer = data.toString().trim().toLowerCase()
			resolve(answer === 'y' || answer === 'yes')
		})
	})
}

// Run the script
main().catch(console.error)
