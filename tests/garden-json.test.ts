import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma, PrismaClient } from '@prisma/client'
import { nullableJsonInput } from '../src/lib/server/json-input.ts'
import { requireLocal } from '../scripts/lib/database.ts'

test('JSON inputs distinguish omitted updates, column clearing, and nested nulls', () => {
	assert.equal(nullableJsonInput(undefined), undefined)
	assert.equal(nullableJsonInput(null), Prisma.DbNull)
	const document = { type: 'doc', content: [{ attrs: { optional: null } }] }
	assert.deepEqual(nullableJsonInput(document), document)
	assert.deepEqual(nullableJsonInput({ runtime: null }), { runtime: null })
	assert.throws(() => nullableJsonInput({ invalid: undefined }))
	assert.throws(() => nullableJsonInput({ invalid: Infinity }))
})

test('Garden JSON columns preserve omitted values and clear explicit nulls', {
	skip: !process.env.TEST_DATABASE_URL
}, async () => {
	const url = process.env.TEST_DATABASE_URL!
	assert.ok(requireLocal(url).name.startsWith('jedmund_edra_test_'))
	const prisma = new PrismaClient({ datasourceUrl: url })
	let id: number | undefined
	try {
		const item = await prisma.gardenItem.create({ data: {
			category: 'books', title: 'JSON regression', slug: `json-test-${process.pid}-${Date.now()}`,
			metadata: nullableJsonInput({ runtime: null }),
			note: nullableJsonInput({ type: 'doc', content: [] })
		} })
		id = item.id
		const unchanged = await prisma.gardenItem.update({ where: { id }, data: {
			metadata: nullableJsonInput(undefined), note: nullableJsonInput(undefined)
		} })
		assert.deepEqual(unchanged.metadata, { runtime: null })
		assert.deepEqual(unchanged.note, { type: 'doc', content: [] })
		await prisma.gardenItem.update({ where: { id }, data: {
			metadata: nullableJsonInput(null), note: nullableJsonInput(null)
		} })
		const rows = await prisma.$queryRaw<Array<{ cleared: boolean }>>`
			SELECT metadata IS NULL AND note IS NULL AS cleared FROM "GardenItem" WHERE id = ${id}
		`
		assert.equal(rows[0]?.cleared, true)
	} finally {
		if (id !== undefined) await prisma.gardenItem.delete({ where: { id } })
		await prisma.$disconnect()
	}
})
