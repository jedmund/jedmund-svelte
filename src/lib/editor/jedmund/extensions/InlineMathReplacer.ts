import { Extension, InputRule } from '@tiptap/core'

/** Converts a completed `$$…$$` sequence into TipTap v3's inlineMath node. */
export const InlineMathReplacer = Extension.create({
	name: 'inlineMathReplacer',

	addInputRules() {
		return [
			new InputRule({
				find: /\$\$([^$]+)\$\$$/,
				handler: ({ state, range, match }) => {
					const latex = match[1]
					const inlineMath = state.schema.nodes.inlineMath
					if (!latex || !inlineMath) return

					state.tr.replaceWith(range.from, range.to, inlineMath.create({ latex }))
				}
			})
		]
	}
})
