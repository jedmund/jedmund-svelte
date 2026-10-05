<script lang="ts">
	import type { NodeViewProps } from '@tiptap/core'
	import { NodeViewWrapper } from '$lib/components/edra/tiptap/index.js'
	import { onMount } from 'svelte'
	import CopyIcon from '@lucide/svelte/icons/copy'
	import Plus from '@lucide/svelte/icons/plus'
	import Trash from '@lucide/svelte/icons/trash'
	import X from '@lucide/svelte/icons/x'
	import NodeToolbar from './NodeToolbar.svelte'
	import { duplicateNode } from '../../node-actions.js'
	import { normalizeStanzas, type LyricsStanza } from '$lib/utils/content/lyrics.js'

	let { node, editor, selected, updateAttributes, deleteNode, getPos }: NodeViewProps = $props()

	type Side = 'a' | 'b'

	let groupRef = $state<HTMLElement>()

	const stanzas = $derived(normalizeStanzas(node.attrs.stanzas))
	const langA = $derived(String(node.attrs.langA || 'ja'))
	const langB = $derived(String(node.attrs.langB || 'en'))

	onMount(() => {
		// Only the slash command sets this, so reopening a saved post never steals focus.
		if (!editor.storage.lyrics?.autoFocus) return
		editor.storage.lyrics.autoFocus = false
		groupRef?.querySelector<HTMLInputElement>('.lyrics-title-input')?.focus()
	})

	function setText(name: string, value: string) {
		updateAttributes({ [name]: value || null })
	}

	function setStanzas(next: LyricsStanza[]) {
		updateAttributes({ stanzas: next })
	}

	function setStanza(index: number, side: Side, value: string) {
		setStanzas(stanzas.map((stanza, i) => (i === index ? { ...stanza, [side]: value } : stanza)))
	}

	/** Pasting several blank-line-separated stanzas into an empty box fills that column downward. */
	function pasteStanzas(event: ClipboardEvent, index: number, side: Side) {
		if (stanzas[index]?.[side].trim()) return
		const blocks = (event.clipboardData?.getData('text/plain') ?? '')
			.replace(/\r\n/g, '\n')
			.split(/\n[ \t]*\n+/)
			.map((block) => block.trim())
			.filter(Boolean)
		if (blocks.length < 2) return
		event.preventDefault()
		const next = [...stanzas]
		blocks.forEach((block, offset) => {
			const target = next[index + offset] ?? { a: '', b: '' }
			next[index + offset] = { ...target, [side]: block }
		})
		setStanzas(next)
	}

	function addStanza() {
		setStanzas([...stanzas, { a: '', b: '' }])
	}

	function removeStanza(index: number) {
		setStanzas(stanzas.filter((_, i) => i !== index))
	}
</script>

<NodeViewWrapper>
	<div bind:this={groupRef} class="lyrics-node" class:selected>
		<div class="lyrics-columns lyrics-meta">
			{#each [{ side: 'A', lang: langA }, { side: 'B', lang: langB }] as column, i (column.side)}
				<div class="lyrics-meta-column">
					<label class="lyrics-lang">
						<span>Language {column.side}</span>
						<input
							value={column.lang}
							placeholder={i === 0 ? 'ja' : 'en'}
							disabled={!editor.isEditable}
							oninput={(event) =>
								updateAttributes({ [`lang${column.side}`]: event.currentTarget.value.trim() })}
						/>
					</label>
					<input
						class="lyrics-title-input"
						lang={column.lang}
						value={node.attrs[`title${column.side}`] ?? ''}
						placeholder="Title"
						disabled={!editor.isEditable}
						oninput={(event) => setText(`title${column.side}`, event.currentTarget.value)}
					/>
					<input
						class="lyrics-artist-input"
						lang={column.lang}
						value={node.attrs[`artist${column.side}`] ?? ''}
						placeholder="Artist"
						disabled={!editor.isEditable}
						oninput={(event) => setText(`artist${column.side}`, event.currentTarget.value)}
					/>
				</div>
			{/each}
		</div>

		{#each stanzas as stanza, index (index)}
			<div class="lyrics-columns lyrics-stanza-row">
				{#each [{ side: 'a' as Side, lang: langA }, { side: 'b' as Side, lang: langB }] as column (column.side)}
					<textarea
						lang={column.lang}
						rows="3"
						value={stanza[column.side]}
						placeholder={index === 0 ? 'Paste lyrics — blank lines split stanzas' : ''}
						disabled={!editor.isEditable}
						oninput={(event) => setStanza(index, column.side, event.currentTarget.value)}
						onpaste={(event) => pasteStanzas(event, index, column.side)}
					></textarea>
				{/each}
				{#if editor.isEditable && stanzas.length > 1}
					<button
						type="button"
						class="lyrics-remove"
						title="Remove stanza"
						onclick={() => removeStanza(index)}
					>
						<X size={14} strokeWidth={2} />
					</button>
				{/if}
			</div>
		{/each}

		{#if editor.isEditable}
			<button type="button" class="lyrics-add" onclick={addStanza}>
				<Plus size={14} strokeWidth={2} />
				Add stanza
			</button>

			<NodeToolbar anchor={groupRef} {selected}>
				<button
					type="button"
					class="edra-toolbar-button"
					onclick={() => duplicateNode(editor, node, getPos)}
					title="Duplicate"
				>
					<CopyIcon size={16} strokeWidth={2} />
				</button>
				<div class="edra-toolbar-divider"></div>
				<button
					type="button"
					class="edra-toolbar-button edra-destructive"
					onclick={() => deleteNode()}
					title="Delete"
				>
					<Trash size={16} strokeWidth={2} />
				</button>
			</NodeToolbar>
		{/if}
	</div>
</NodeViewWrapper>

<style lang="scss">
	.lyrics-node {
		display: flex;
		flex-direction: column;
		gap: $unit;
		margin: $unit-2x 0;
		padding: $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius;
		background: $gray-97;
		transition: border-color 0.2s;

		&.selected {
			border-color: $primary-color;
		}
	}

	.lyrics-columns {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: $unit;
	}

	.lyrics-meta {
		padding-bottom: $unit;
		border-bottom: 1px solid $gray-85;
	}

	.lyrics-meta-column {
		display: flex;
		flex-direction: column;
		gap: $unit-half;
	}

	.lyrics-lang {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size-extra-small;
		font-weight: 500;
		color: $gray-40;

		input {
			width: 6em;
			padding: 2px $unit-half;
			font-size: $font-size-extra-small;
		}
	}

	input,
	textarea {
		width: 100%;
		padding: $unit $unit-2x;
		border: 1px solid $gray-85;
		border-radius: $corner-radius-sm;
		background: $white;
		color: $text-color;
		font-family: inherit;
		font-size: $font-size-small;

		&:focus {
			outline: none;
			border-color: $primary-color;
		}
	}

	// Leave room for the remove button over the B column
	.lyrics-stanza-row textarea:last-of-type {
		padding-right: $unit-4x;
	}

	.lyrics-title-input {
		font-weight: 600;
	}

	textarea {
		min-height: 3lh;
		line-height: 1.6;
		resize: vertical;
		field-sizing: content;
	}

	.lyrics-remove,
	.lyrics-add {
		display: flex;
		align-items: center;
		gap: $unit-half;
		border: none;
		background: none;
		color: $gray-40;
		font-size: $font-size-extra-small;
		cursor: pointer;

		&:hover {
			color: $text-color;
		}
	}

	.lyrics-remove {
		position: absolute;
		top: $unit-half;
		right: $unit-half;
		padding: $unit-half;
	}

	.lyrics-add {
		align-self: flex-start;
		padding: $unit-half 0;
	}
</style>
