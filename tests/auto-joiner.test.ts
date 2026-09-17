import assert from 'node:assert/strict'
import test from 'node:test'
import { getSchema } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorState } from '@tiptap/pm/state'
import { autoJoin } from '../src/lib/editor/jedmund/extensions/AutoJoiner.ts'

test('joins adjacent v3 list nodes after an intervening block is removed', () => {
	const schema = getSchema([StarterKit])
	const list = (text: string) => ({
		type: 'bulletList',
		content: [
			{
				type: 'listItem',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			}
		]
	})
	const doc = schema.nodeFromJSON({
		type: 'doc',
		content: [
			list('one'),
			{ type: 'paragraph', content: [{ type: 'text', text: 'gap' }] },
			list('two')
		]
	})
	const state = EditorState.create({ doc })
	let paragraphPosition = 0
	state.doc.descendants((node, position) => {
		if (node.type.name === 'paragraph' && node.textContent === 'gap') paragraphPosition = position
	})

	const removal = state.tr.delete(paragraphPosition, paragraphPosition + 5)
	const nextState = EditorState.create({ doc: removal.doc })
	const appended = nextState.tr

	assert.equal(autoJoin(removal, appended, [schema.nodes.bulletList!]), true)
	assert.equal(appended.doc.childCount, 1)
	assert.equal(appended.doc.firstChild?.type.name, 'bulletList')
	assert.equal(appended.doc.firstChild?.childCount, 2)
})
