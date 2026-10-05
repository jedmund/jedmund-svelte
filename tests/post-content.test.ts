import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import {
	emptyDoc,
	ensureNonEmptyDoc,
	normalizeContent
} from '../src/lib/components/admin/forms/post-content.ts'

const schema = getSchema([StarterKit])
const assertValidDoc = (doc: object) => assert.doesNotThrow(() => schema.nodeFromJSON(doc).check())

test('an empty doc fails the editor content check', () => {
	assert.throws(() => schema.nodeFromJSON({ type: 'doc', content: [] }).check(), /Invalid content/)
})

test('new and empty post content opens as a valid doc', () => {
	assertValidDoc(emptyDoc())
	assertValidDoc(normalizeContent(null))
	assertValidDoc(normalizeContent({ type: 'doc', content: [] }))
	assertValidDoc(normalizeContent({ type: 'doc' }))
	assertValidDoc(normalizeContent({ blocks: [] }))
	assertValidDoc(ensureNonEmptyDoc({ type: 'doc', content: [] }))
})

test('non-empty content is returned unchanged', () => {
	const doc = {
		type: 'doc',
		content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }]
	}
	assert.equal(normalizeContent(doc), doc)
	assert.equal(ensureNonEmptyDoc(doc), doc)
})
