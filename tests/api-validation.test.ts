import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { readValidatedBody, parseId } from '../src/lib/api/validation.ts'
import {
	getPaginationParams,
	getOffsetPaginationParams,
	PaginationError
} from '../src/lib/server/pagination.ts'
import {
	createPostSchema,
	updatePostSchema,
	createProjectSchema,
	updateProjectSchema,
	createAlbumSchema,
	updateAlbumSchema,
	createGardenSchema,
	updateGardenSchema,
	albumMediaSchema,
	hasPublishableContent,
	validatePublishing
} from '../src/lib/schemas/cms.ts'

const empty = { type: 'doc', content: [{ type: 'paragraph' }] }
const content = {
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }]
}

test('request validation preserves every existing editor fixture without rewriting attributes', async () => {
	for (const path of [
		'tests/fixtures/edra-documents.json',
		'tests/fixtures/edra-compatibility.json'
	]) {
		const fixtures = JSON.parse(await readFile(path, 'utf8')) as Array<{ content: unknown }>
		for (const fixture of fixtures) {
			assert.deepEqual(
				createPostSchema.parse({ type: 'post', content: fixture.content }).content,
				fixture.content
			)
		}
	}
})

test('body parsing rejects invalid JSON and non-object bodies with a consistent 400', async () => {
	for (const body of ['{', 'null', '[]', 'true', '1', '"text"', '{"type":7}']) {
		const result = await readValidatedBody(
			new Request('http://localhost', { method: 'POST', body }),
			createPostSchema
		)
		assert.equal(result.success, false)
		if (result.success) continue
		assert.equal(result.response.status, 400)
		assert.equal((await result.response.json()).error.code, 'BAD_REQUEST')
	}
	const result = await readValidatedBody(
		new Request('http://localhost', { method: 'POST', body: '{"type":"essay"}' }),
		createPostSchema
	)
	assert.deepEqual(result, { success: true, data: { type: 'essay' } })
})

test('schemas preserve incomplete drafts, JSON content, omitted values and explicit nulls', () => {
	assert.ok(
		createPostSchema.safeParse({ type: 'essay', status: 'draft', title: '', content: empty })
			.success
	)
	assert.ok(
		createProjectSchema.safeParse({
			title: 'Draft',
			year: 2026,
			externalUrl: 'unfinished',
			backgroundColor: '#',
			status: 'draft'
		}).success
	)
	for (const schema of [
		updatePostSchema,
		updateProjectSchema,
		updateAlbumSchema,
		updateGardenSchema
	]) {
		assert.deepEqual(schema.parse({}), {})
		assert.deepEqual(schema.parse({ title: 'Edit', unsupported: 'ignored' }), { title: 'Edit' })
	}
	assert.deepEqual(updateGardenSchema.parse({ metadata: null, note: null }), {
		metadata: null,
		note: null
	})
	const doc = {
		...content,
		custom: { nullable: null },
		content: [{ type: 'custom-node', attrs: { custom: 'preserved' } }]
	}
	assert.deepEqual(createPostSchema.parse({ type: 'post', content: doc }).content, doc)
	assert.deepEqual(updatePostSchema.parse({ tags: { deleteMany: {} }, tagIds: [1] }), {
		tagIds: [1]
	})
})

test('schemas reject bad field types, statuses, IDs, dates and storage limits', () => {
	for (const input of [
		{ type: 'note' },
		{ type: 'post', status: 'other' },
		{ type: 'post', title: 'x'.repeat(256) },
		{ type: 'post', syndicateBluesky: 'true' },
		{ type: 'post', attachedPhotos: ['1'] }
	])
		assert.equal(createPostSchema.safeParse(input).success, false)
	for (const value of [0, -1, 1.2, 2_147_483_648, '2'])
		assert.equal(albumMediaSchema.safeParse({ mediaIds: [value] }).success, false)
	assert.equal(albumMediaSchema.safeParse({ mediaIds: [] }).success, false)
	assert.equal(createProjectSchema.safeParse({ title: 'Title', year: '2026' }).success, false)
	assert.equal(createGardenSchema.safeParse({ title: 'Title', category: 'unknown' }).success, false)
	assert.equal(updateGardenSchema.safeParse({ rating: 6 }).success, false)
	for (const value of ['0000', 'not-a-date', '2026-02-30', '2026-13-01', '2026-02-30T12:00:00Z'])
		assert.equal(updateAlbumSchema.safeParse({ date: value }).success, false)
	for (const value of ['2026', '2024-02-29', '2026-01-01T01:00:00+01:00', null, ''])
		assert.ok(createAlbumSchema.safeParse({ title: 'Album', slug: 'album', date: value }).success)
	assert.equal(updatePostSchema.safeParse({ updatedAt: 'yesterday' }).success, false)
	for (const content of [
		{ type: 'doc', content: 'wrong' },
		{ type: 'doc', content: [{ type: 'text', text: 3 }] },
		{ type: 'doc', content: [{ type: 'text', marks: 'wrong' }] }
	])
		assert.equal(createPostSchema.safeParse({ type: 'post', content }).success, false)
})

test('publishing validates effective records while drafts remain permissive', async () => {
	const post = { postType: 'post', slug: 'post', status: 'published', content: empty }
	assert.equal(validatePublishing('post', post)?.status, 400)
	assert.equal(validatePublishing('post', { ...post, content }), null)
	assert.equal(validatePublishing('post', { ...post, attachments: [1] }), null)
	assert.equal(validatePublishing('post', { ...post, status: 'draft' }), null)
	assert.equal(validatePublishing('post', { ...post, postType: 'essay', content })?.status, 400)
	assert.equal(
		validatePublishing('post', { ...post, postType: 'essay', title: 'Essay', content }),
		null
	)
	const project = {
		title: 'Project',
		slug: 'project',
		year: 2026,
		status: 'published',
		projectType: 'work',
		password: null
	}
	assert.equal(validatePublishing('project', project), null)
	for (const fields of [
		{ title: ' ' },
		{ externalUrl: 'not-a-url' },
		{ backgroundColor: '#' },
		{ year: 1989 },
		{ status: 'password-protected' }
	])
		assert.equal(validatePublishing('project', { ...project, ...fields })?.status, 400)
	assert.equal(
		validatePublishing('project', {
			...project,
			status: 'password-protected',
			password: 'synthetic'
		}),
		null
	)
	assert.equal(validatePublishing('project', { ...project, status: 'list-only' }), null)
	assert.equal(
		validatePublishing('album', { status: 'published', title: 'Album', slug: 'album' }),
		null
	)
	assert.equal(
		validatePublishing('album', { status: 'published', title: 'Album', slug: 'BAD SLUG' })?.status,
		400
	)
	assert.equal(
		validatePublishing('garden', {
			status: 'published',
			title: 'Book',
			slug: 'book',
			category: 'books'
		}),
		null
	)
	const invalid = validatePublishing('garden', {
		status: 'published',
		title: '',
		slug: 'book',
		category: 'books'
	})!
	assert.ok((await invalid.json()).error.details.fieldErrors.title.length)
})

test('content presence supports media and legacy documents without accepting blank placeholders', () => {
	for (const value of [
		empty,
		null,
		{ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: ' \n ' }] }] },
		{ blocks: [{ type: 'paragraph', content: '<br>&nbsp;' }] },
		{ type: 'imagePlaceholder', attrs: { src: '/test.png' } }
	])
		assert.equal(hasPublishableContent(value), false)
	for (const value of [
		content,
		{ blocks: [{ type: 'paragraph', content: 'Legacy' }] },
		{ type: 'image', attrs: { src: '/test.png' } },
		{ type: 'gallery', attrs: { images: [{ url: '/test.png' }] } },
		{ type: 'urlEmbed', attrs: { url: 'https://example.com' } }
	])
		assert.equal(hasPublishableContent(value), true)
})

test('pagination defaults only missing values and rejects malformed or overflowing values', async () => {
	const url = (query = '') => new URL(`http://localhost/?${query}`)
	assert.deepEqual(getPaginationParams(url()), { page: 1, limit: 20 })
	assert.deepEqual(getOffsetPaginationParams(url()), { offset: 0, limit: 50 })
	assert.deepEqual(getOffsetPaginationParams(url(), { limit: 5, maxLimit: 10 }), {
		offset: 0,
		limit: 5
	})
	assert.deepEqual(getPaginationParams(url('page=2&limit=100')), { page: 2, limit: 100 })
	assert.deepEqual(getOffsetPaginationParams(url('offset=0&limit=1')), { offset: 0, limit: 1 })
	for (const query of [
		'page=',
		'page=0',
		'page=-1',
		'page=1.5',
		'page=12junk',
		'page=1e2',
		'page=Infinity',
		'limit=101',
		'limit=0',
		'limit=NaN',
		'page=2147483647&limit=100'
	])
		assert.throws(() => getPaginationParams(url(query)), PaginationError)
	for (const query of ['offset=', 'offset=-1', 'offset=2.5', 'offset=2147483648', 'limit=101'])
		assert.throws(() => getOffsetPaginationParams(url(query)), PaginationError)
	assert.throws(() => getOffsetPaginationParams(url('limit=11'), { maxLimit: 10 }), PaginationError)
	assert.equal((await new PaginationError('page').response().json()).error.code, 'BAD_REQUEST')
	for (const id of ['0', '-1', '1.2', '1oops', '2147483648', '']) assert.equal(parseId(id), null)
	assert.equal(parseId('12'), 12)
})
