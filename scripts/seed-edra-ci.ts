import { readFile } from 'node:fs/promises'
import { requireLocal } from './lib/database.ts'

// Deliberately do not load local dotenv files: CI supplies this explicitly.
if (requireLocal(process.env.DATABASE_URL).name !== 'jedmund_edra_test_ci') {
	throw new Error('Synthetic seeding requires jedmund_edra_test_ci on loopback')
}
const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
try {
	const fixtures = [
		...JSON.parse(await readFile('tests/fixtures/edra-documents.json', 'utf8')),
		...JSON.parse(await readFile('tests/fixtures/edra-compatibility.json', 'utf8'))
	]
	await prisma.$transaction(async (tx) => {
		for (const [index, fixture] of fixtures.entries()) {
			await tx.post.create({
				data: {
					slug: `edra-ci-${index}`,
					postType: 'note',
					content: fixture.content,
					syndicateBluesky: false,
					syndicateMastodon: false
				}
			})
		}
		await tx.project.create({
			data: {
				slug: 'edra-ci',
				title: 'Synthetic project',
				year: 2026,
				caseStudyContent: fixtures[0].content
			}
		})
		await tx.album.create({
			data: { slug: 'edra-ci', title: 'Synthetic album', content: fixtures[0].content }
		})
		await tx.gardenItem.create({
			data: {
				slug: 'edra-ci',
				category: 'books',
				title: 'Synthetic garden item',
				note: fixtures[0].content
			}
		})
	})
} finally {
	await prisma.$disconnect()
}
