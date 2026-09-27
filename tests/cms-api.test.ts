import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { readFile, readdir } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import { parse as parseEnv } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { requireLocal } from '../scripts/lib/database.ts'

test(
	'core CMS HTTP contracts against a synthetic local database',
	{ skip: !process.env.TEST_DATABASE_URL, timeout: 180_000 },
	async (t) => {
		const databaseUrl = process.env.TEST_DATABASE_URL!
		assert.ok(requireLocal(databaseUrl).name.startsWith('jedmund_edra_test_'))
		const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
		assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(redisUrl).hostname))
		const prisma = new PrismaClient({ datasourceUrl: databaseUrl })
		const prefix = `cms-api-${process.pid}-${Date.now()}`
		const mediaIds: number[] = []
		t.after(async () => {
			await prisma.post.deleteMany({ where: { slug: { startsWith: prefix } } })
			await prisma.project.deleteMany({ where: { slug: { startsWith: prefix } } })
			await prisma.album.deleteMany({ where: { slug: { startsWith: prefix } } })
			await prisma.gardenItem.deleteMany({ where: { slug: { startsWith: prefix } } })
			await prisma.media.deleteMany({ where: { id: { in: mediaIds } } })
			await prisma.$disconnect()
		})
		assert.equal(
			await prisma.setting.count({ where: { isSecret: true, value: { not: '' } } }),
			0,
			'Use a synthetic database without integration secrets'
		)

		// Neither dotenv nor Vite should import local integration credentials into the test server.
		const fileKeys: string[] = []
		for (const name of await readdir('.')) {
			if (name === '.env' || name.startsWith('.env.')) {
				fileKeys.push(...Object.keys(parseEnv(await readFile(name))))
			}
		}
		const listener = createServer()
		listener.listen(0, '127.0.0.1')
		await once(listener, 'listening')
		const address = listener.address()
		assert.ok(address && typeof address !== 'string')
		const port = address.port
		await new Promise<void>((resolve) => listener.close(() => resolve()))
		const base = `http://127.0.0.1:${port}`
		const child = spawn(
			process.execPath,
			[
				'node_modules/vite/bin/vite.js',
				'--host',
				'127.0.0.1',
				'--port',
				String(port),
				'--strictPort'
			],
			{
				env: {
					...Object.fromEntries(fileKeys.map((key) => [key, ''])),
					PATH: process.env.PATH,
					TMPDIR: process.env.TMPDIR,
					NODE_ENV: 'test',
					DOTENV_CONFIG_PATH: '/dev/null',
					DATABASE_URL: databaseUrl,
					REDIS_URL: redisUrl,
					ADMIN_PASSWORD: 'synthetic-cms-password',
					ADMIN_SESSION_SECRET: 'synthetic-cms-session',
					GIANTBOMB_API_KEY: 'synthetic-only',
					SITE_URL: base
				},
				stdio: ['ignore', 'pipe', 'pipe']
			}
		)
		let output = ''
		for (const stream of [child.stdout, child.stderr])
			stream.on('data', (chunk) => {
				output = (output + String(chunk)).slice(-16000)
			})
		t.after(async () => {
			if (child.exitCode === null && child.signalCode === null) {
				const exited = once(child, 'exit')
				child.kill('SIGTERM')
				await exited
			}
		})
		let ready = false
		for (let attempt = 0; attempt < 120; attempt++) {
			if (child.exitCode !== null) throw new Error(output)
			try {
				const response = await fetch(`${base}/api/posts`, { signal: AbortSignal.timeout(1000) })
				if (response.status === 401) {
					ready = true
					break
				}
			} catch {
				/* Server is still starting. */
			}
			await delay(250)
		}
		assert.ok(ready, output)
		const login = await fetch(`${base}/admin/login`, {
			method: 'POST',
			headers: { origin: base, accept: 'text/html' },
			body: new URLSearchParams({ password: 'synthetic-cms-password' }),
			redirect: 'manual'
		})
		assert.equal(login.status, 303, await login.clone().text())
		const cookie = login.headers
			.getSetCookie()
			.map((value) => value.split(';')[0])
			.join('; ')
		assert.ok(cookie.includes('admin_session='))
		async function api(path: string, method = 'GET', body?: unknown) {
			return fetch(`${base}${path}`, {
				method,
				headers: { cookie, origin: base, 'content-type': 'application/json' },
				body: body === undefined ? undefined : JSON.stringify(body)
			})
		}
		async function expectBad(response: Response, field?: string) {
			assert.equal(response.status, 400, await response.clone().text())
			const result = await response.json()
			assert.equal(result.error.code, 'BAD_REQUEST')
			if (field) assert.ok(result.error.details.fieldErrors[field]?.length, JSON.stringify(result))
		}
		const document = {
			type: 'doc',
			content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Synthetic content' }] }]
		}
		const blank = { type: 'doc', content: [{ type: 'paragraph' }] }

		await t.test(
			'creation-time publishing validation rejects incomplete records without inserting them',
			async () => {
				const invalidPrefix = `${prefix}-invalid-`
				await expectBad(
					await api('/api/posts', 'POST', {
						type: 'post',
						slug: `${invalidPrefix}post`,
						status: 'published',
						content: blank
					}),
					'content'
				)
				await expectBad(
					await api('/api/projects', 'POST', {
						title: 'Project',
						slug: `${invalidPrefix}project`,
						year: 1980,
						status: 'published'
					}),
					'year'
				)
				await expectBad(
					await api('/api/albums', 'POST', {
						title: 'Album',
						slug: `${invalidPrefix}album BAD`,
						status: 'published'
					}),
					'slug'
				)
				await expectBad(
					await api('/api/admin/garden', 'POST', {
						title: 'Book',
						category: 'books',
						slug: `${invalidPrefix}garden BAD`,
						status: 'published'
					}),
					'slug'
				)
				const where = { slug: { startsWith: invalidPrefix } }
				assert.deepEqual(
					await Promise.all([
						prisma.post.count({ where }),
						prisma.project.count({ where }),
						prisma.album.count({ where }),
						prisma.gardenItem.count({ where })
					]),
					[0, 0, 0, 0]
				)
			}
		)

		await t.test(
			'bad pagination and malformed bodies return 400, and auth still returns 401',
			async () => {
				for (const path of [
					'/api/posts',
					'/api/projects',
					'/api/albums',
					'/api/media',
					'/api/photos'
				]) {
					await expectBad(await api(`${path}?limit=nope`), 'limit')
					await expectBad(await api(`${path}?limit=101`), 'limit')
				}
				for (const path of ['/api/posts', '/api/projects', '/api/albums', '/api/admin/garden']) {
					await expectBad(
						await fetch(`${base}${path}`, {
							method: 'POST',
							headers: { cookie, origin: base, 'content-type': 'application/json' },
							body: '{'
						})
					)
					await expectBad(await api(path, 'POST', null))
				}
				assert.equal((await fetch(`${base}/api/posts`)).status, 401)
				assert.equal((await fetch(`${base}/api/admin/garden`)).status, 401)
				await expectBad(await api('/api/posts/1junk'))
			}
		)

		await t.test(
			'Post drafts, publishing, existing published edits and concurrency use the effective record',
			async () => {
				const create = await api('/api/posts', 'POST', {
					type: 'essay',
					slug: `${prefix}-post`,
					title: '',
					content: blank,
					syndicateBluesky: false,
					syndicateMastodon: false
				})
				assert.equal(create.status, 201, await create.clone().text())
				const post = await create.json()
				const path = `/api/posts/${post.id}`
				await expectBad(await api(path, 'PATCH', { status: 'published' }), 'title')
				assert.equal(
					(await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status,
					'draft'
				)
				const save = await api(path, 'PUT', {
					title: 'Essay',
					content: document,
					updatedAt: post.updatedAt
				})
				assert.equal(save.status, 200)
				const saved = await save.json()
				assert.equal(
					(await api(path, 'PATCH', { status: 'published', updatedAt: post.updatedAt })).status,
					409
				)
				assert.equal(
					(await api(path, 'PATCH', { status: 'published', updatedAt: saved.updatedAt })).status,
					200
				)
				const before = await prisma.post.findUniqueOrThrow({ where: { id: post.id } })
				await expectBad(await api(path, 'PUT', { title: '' }), 'title')
				await expectBad(await api(path, 'PATCH', { content: blank }), 'content')
				assert.deepEqual(await prisma.post.findUniqueOrThrow({ where: { id: post.id } }), before)
				assert.equal(
					(await api(path, 'PATCH', { status: 'draft', title: '', content: blank })).status,
					200
				)
				assert.equal((await api(path, 'PUT', { title: 'Still editable' })).status, 200)
				assert.equal(
					(await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).status,
					'draft'
				)
			}
		)

		await t.test(
			'media-only Posts publish and omitted attachments survive partial saves',
			async () => {
				const media = await prisma.media.create({
					data: { filename: 'synthetic.png', mimeType: 'image/png', size: 1, url: '/synthetic.png' }
				})
				mediaIds.push(media.id)
				const response = await api('/api/posts', 'POST', {
					type: 'post',
					slug: `${prefix}-media`,
					status: 'published',
					content: blank,
					attachedPhotos: [media.id],
					syndicateBluesky: false,
					syndicateMastodon: false
				})
				assert.equal(response.status, 201, await response.clone().text())
				const post = await response.json()
				assert.equal(post.featuredImage, String(media.id))
				assert.equal(
					(await api(`/api/posts/${post.id}`, 'PUT', { excerpt: 'A photo' })).status,
					200
				)
				assert.deepEqual(
					(await prisma.post.findUniqueOrThrow({ where: { id: post.id } })).attachments,
					[media.id]
				)
				await expectBad(
					await api(`/api/posts/${post.id}`, 'PATCH', { attachedPhotos: [] }),
					'content'
				)
			}
		)

		await t.test(
			'Projects enforce publishing rules on PUT and PATCH while allowing incomplete drafts',
			async () => {
				const response = await api('/api/projects', 'POST', {
					title: 'Draft',
					year: 2026,
					slug: `${prefix}-project`,
					externalUrl: 'unfinished',
					caseStudyContent: document
				})
				assert.equal(response.status, 201, await response.clone().text())
				const project = await response.json()
				const path = `/api/projects/${project.id}`
				await expectBad(await api(path, 'PATCH', { status: 'published' }), 'externalUrl')
				await expectBad(
					await api(path, 'PUT', { status: 'password-protected', externalUrl: '' }),
					'password'
				)
				assert.equal((await api(path, 'PUT', { externalUrl: '', status: 'list-only' })).status, 200)
				await expectBad(await api(path, 'PUT', { year: 1980 }), 'year')
				assert.equal(
					(await api(path, 'PATCH', { status: 'password-protected', password: 'synthetic' }))
						.status,
					200
				)
				assert.equal(
					(
						await api(path, 'PUT', {
							status: 'draft',
							externalUrl: 'unfinished',
							caseStudyContent: null
						})
					).status,
					200
				)
				const stored = await prisma.project.findUniqueOrThrow({ where: { id: project.id } })
				assert.equal(stored.caseStudyContent, null)
				assert.equal(stored.externalUrl, 'unfinished')
			}
		)

		await t.test('Albums validate dates, publish through PUT and add/remove media', async () => {
			await expectBad(
				await api('/api/albums', 'POST', {
					title: 'Album',
					slug: `${prefix}-invalid-date`,
					date: '2026-02-30'
				}),
				'date'
			)
			const response = await api('/api/albums', 'POST', {
				title: 'Album',
				slug: `${prefix}-album`,
				date: '2026'
			})
			assert.equal(response.status, 201)
			const album = await response.json()
			assert.ok(album.date.startsWith('2026-01-01'))
			const path = `/api/albums/${album.id}`
			assert.equal((await api(path, 'PUT', { status: 'published' })).status, 200)
			await expectBad(await api(path, 'PUT', { title: ' ' }), 'title')
			assert.equal(
				(await api(path, 'PUT', { title: 'Changed', updatedAt: album.updatedAt })).status,
				409
			)
			await expectBad(await api(`${path}/media`, 'POST', { mediaIds: ['bad'] }), 'mediaIds')
			assert.equal((await api(`${path}/media`, 'POST', { mediaIds })).status, 200)
			assert.equal(await prisma.albumMedia.count({ where: { albumId: album.id } }), 1)
			assert.equal((await api(`${path}/media`, 'DELETE', { mediaIds })).status, 200)
			assert.equal(await prisma.albumMedia.count({ where: { albumId: album.id } }), 0)
		})

		await t.test('Garden validates published edits, JSON clearing and stale writes', async () => {
			const response = await api('/api/admin/garden', 'POST', {
				title: 'Book',
				slug: `${prefix}-garden`,
				category: 'books',
				status: 'published',
				metadata: { runtime: null },
				note: document
			})
			assert.equal(response.status, 201, await response.clone().text())
			const item = await response.json()
			const path = `/api/admin/garden/${item.id}`
			const before = await prisma.gardenItem.findUniqueOrThrow({ where: { id: item.id } })
			await expectBad(await api(path, 'PUT', { title: ' ' }), 'title')
			await expectBad(await api(path, 'PUT', { category: 'invalid' }), 'category')
			assert.deepEqual(
				await prisma.gardenItem.findUniqueOrThrow({ where: { id: item.id } }),
				before
			)
			assert.equal((await api(path, 'PUT', { note: null, updatedAt: item.updatedAt })).status, 200)
			const stored = await prisma.gardenItem.findUniqueOrThrow({ where: { id: item.id } })
			assert.equal(stored.note, null)
			assert.deepEqual(stored.metadata, { runtime: null })
			assert.equal(
				(await api(path, 'PUT', { summary: 'stale', updatedAt: item.updatedAt })).status,
				409
			)
		})

		await t.test(
			'status-only form actions return actionable failures on the original page',
			async () => {
				const post = await prisma.post.findFirstOrThrow({ where: { slug: `${prefix}-post` } })
				const response = await fetch(`${base}/admin/posts?/toggleStatus`, {
					method: 'POST',
					headers: { cookie, origin: base, accept: 'text/html' },
					body: new URLSearchParams({
						id: String(post.id),
						status: 'published',
						updatedAt: post.updatedAt.toISOString()
					})
				})
				assert.equal(response.status, 400)
				assert.match(await response.text(), /Add content or media before publishing/)
			}
		)
	}
)
