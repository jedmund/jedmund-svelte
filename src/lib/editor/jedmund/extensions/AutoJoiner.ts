import { Extension, getNodeType } from '@tiptap/core'
import type { NodeType } from '@tiptap/pm/model'
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state'
import { canJoin } from '@tiptap/pm/transform'

// Adapted for TipTap v3 from tiptap-extension-auto-joiner 0.1.3 (MIT).
// The original package targets TipTap v2 and has no v3 release.
export function autoJoin(
	transaction: Transaction,
	latestTransaction: Transaction,
	nodeTypes: NodeType[]
): boolean {
	const ranges: number[] = []
	for (const map of transaction.mapping.maps) {
		for (let index = 0; index < ranges.length; index += 1) {
			ranges[index] = map.map(ranges[index]!)
		}
		map.forEach((_oldStart, _oldEnd, from, to) => ranges.push(from, to))
	}

	const joinable: number[] = []
	for (let index = 0; index < ranges.length; index += 2) {
		const from = ranges[index]!
		const to = ranges[index + 1]!
		const $from = transaction.doc.resolve(from)
		const depth = $from.sharedDepth(to)
		const parent = $from.node(depth)

		let childIndex = $from.indexAfter(depth)
		let position = $from.after(depth + 1)
		while (position <= to) {
			const after = parent.maybeChild(childIndex)
			if (!after) break
			if (childIndex > 0 && !joinable.includes(position)) {
				const before = parent.child(childIndex - 1)
				if (before.type === after.type && nodeTypes.includes(before.type)) {
					joinable.push(position)
				}
			}
			position += after.nodeSize
			childIndex += 1
		}
	}

	let joined = false
	joinable.sort((left, right) => left - right)
	for (let index = joinable.length - 1; index >= 0; index -= 1) {
		const position = joinable[index]!
		if (canJoin(latestTransaction.doc, position)) {
			latestTransaction.join(position)
			joined = true
		}
	}

	return joined
}

export interface AutoJoinerOptions {
	elementsToJoin: string[]
}

const AutoJoiner = Extension.create<AutoJoinerOptions>({
	name: 'autoJoiner',

	addOptions() {
		return { elementsToJoin: [] }
	},

	addProseMirrorPlugins() {
		const joinableNodes = [
			this.editor.schema.nodes.bulletList,
			this.editor.schema.nodes.orderedList,
			...this.options.elementsToJoin.map((name) => getNodeType(name, this.editor.schema))
		].filter((nodeType): nodeType is NodeType => Boolean(nodeType))

		return [
			new Plugin({
				key: new PluginKey(this.name),
				appendTransaction: (transactions, _oldState, newState) => {
					const transaction = newState.tr
					let joined = false
					for (const previous of transactions) {
						joined = autoJoin(previous, transaction, joinableNodes) || joined
					}
					return joined ? transaction : null
				}
			})
		]
	}
})

export default AutoJoiner
