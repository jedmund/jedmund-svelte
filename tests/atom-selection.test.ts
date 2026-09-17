import assert from 'node:assert/strict'
import test from 'node:test'
import { getSchema, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { EditorState, TextSelection } from '@tiptap/pm/state'
import { history, undoDepth } from '@tiptap/pm/history'
import {
	effectivePenetrationThreshold,
	atomPenetrationDepth,
	selectionCoveringNode,
	includeAtomInDragSelection
} from '../src/lib/components/edra/tiptap/extensions/SelectAcrossAtoms.ts'

test('small math atoms use a reachable selection threshold', () => {
	const rect = { left: 0, top: 0, right: 8, bottom: 10, width: 8, height: 10 } as DOMRectReadOnly
	assert.equal(effectivePenetrationThreshold(rect), 4)
	assert.equal(atomPenetrationDepth(4, 5, rect), 4)
	assert.equal(atomPenetrationDepth(20, 5, rect), 0)
})

for (const name of [
	'image',
	'blockMath',
	'gallery',
	'geolocation',
	'urlEmbed',
	'audio',
	'video',
	'iframe'
]) {
	test(`selection across ${name} preserves document and undo history`, () => {
		const atom = Node.create({ name, group: 'block', atom: true })
		const schema = getSchema([StarterKit, atom])
		const doc = schema.nodeFromJSON({
			type: 'doc',
			content: [
				{ type: 'paragraph', content: [{ type: 'text', text: 'before' }] },
				{ type: name },
				{ type: 'paragraph', content: [{ type: 'text', text: 'after' }] }
			]
		})
		const from = doc.child(0).nodeSize,
			to = from + 1
		for (const anchor of [1, to + 2]) {
			const selection = selectionCoveringNode(doc, anchor, from, to)
			assert.ok(selection.from <= from && selection.to >= to)
		}
		let state = EditorState.create({
			doc,
			selection: TextSelection.create(doc, 1, 2),
			plugins: [history()]
		})
		const view = {
			get state() {
				return state
			},
			dispatch: (tr: Parameters<typeof state.apply>[0]) => {
				state = state.apply(tr)
			}
		}
		assert.equal(
			includeAtomInDragSelection(
				view as Parameters<typeof includeAtomInDragSelection>[0],
				from,
				to
			),
			true
		)
		assert.deepEqual(state.doc.toJSON(), doc.toJSON())
		assert.equal(undoDepth(state), 0)
	})
}
