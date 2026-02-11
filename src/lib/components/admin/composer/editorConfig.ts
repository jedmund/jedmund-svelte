import type { Editor } from '@tiptap/core'
import type { ComposerVariant, ComposerFeatures } from './types'
import type { EdraCommand, EdraToolBarCommands } from '$lib/components/edra/commands/types'
import { commands } from '$lib/components/edra/commands/commands.js'
import toolbarCommands from '$lib/components/edra/commands/toolbar-commands.js'

export interface FilteredCommands {
	[key: string]: {
		name: string
		label: string
		commands: EdraCommand[]
	}
}

// Get current text style for dropdown
export function getCurrentTextStyle(editor: Editor): string {
	if (editor.isActive('heading', { level: 1 })) return 'Heading 1'
	if (editor.isActive('heading', { level: 2 })) return 'Heading 2'
	if (editor.isActive('heading', { level: 3 })) return 'Heading 3'
	if (editor.isActive('bulletList')) return 'Bullet List'
	if (editor.isActive('orderedList')) return 'Ordered List'
	if (editor.isActive('taskList')) return 'Task List'
	if (editor.isActive('codeBlock')) return 'Code Block'
	if (editor.isActive('blockquote')) return 'Blockquote'
	return 'Paragraph'
}

// Get filtered commands based on variant and features
export function getFilteredCommands(
	variant: ComposerVariant,
	_features: ComposerFeatures
): FilteredCommands {
	const filtered = { ...commands }

	// Remove groups based on variant
	if (variant === 'minimal') {
		delete filtered['undo-redo']
		delete filtered['headings']
		delete filtered['lists']
		delete filtered['alignment']
		delete filtered['table']
		delete filtered['media']
		delete filtered['fonts']
	} else if (variant === 'inline') {
		delete filtered['undo-redo']
		delete filtered['headings']
		delete filtered['lists']
		delete filtered['alignment']
		delete filtered['table']
		delete filtered['media']
	} else {
		// Full variant - reorganize for toolbar
		delete filtered['undo-redo']
		delete filtered['headings'] // In text style dropdown
		delete filtered['lists'] // In text style dropdown
		delete filtered['alignment']
		delete filtered['table']
		delete filtered['media'] // In media dropdown
	}

	// Reorganize text formatting for toolbar
	if (filtered['text-formatting']) {
		const allCommands = filtered['text-formatting'].commands
		const basicFormatting: EdraCommand[] = []
		const advancedFormatting: EdraCommand[] = []

		// Group basic formatting first
		const basicOrder = ['bold', 'italic', 'underline', 'strike']
		basicOrder.forEach((name) => {
			const cmd = allCommands.find((c) => c.name === name)
			if (cmd) basicFormatting.push(cmd)
		})

		// Then link and code
		const advancedOrder = ['link', 'code']
		advancedOrder.forEach((name) => {
			const cmd = allCommands.find((c) => c.name === name)
			if (cmd) advancedFormatting.push(cmd)
		})

		// Create two groups
		filtered['basic-formatting'] = {
			name: 'Basic Formatting',
			label: 'Basic Formatting',
			commands: basicFormatting
		}

		filtered['advanced-formatting'] = {
			name: 'Advanced Formatting',
			label: 'Advanced Formatting',
			commands: advancedFormatting
		}

		// Remove original text-formatting
		delete filtered['text-formatting']
	}

	return filtered
}

// Get media commands, but filter out based on features
export function getMediaCommands(features: ComposerFeatures): EdraCommand[] {
	if (!commands.media) return []

	let mediaCommands = [...commands.media.commands]

	// Filter based on features
	if (!features.urlEmbed) {
		mediaCommands = mediaCommands.filter((cmd) => cmd.name !== 'iframe-placeholder')
	}

	return mediaCommands
}

// Get color commands
export function getColorCommands(): EdraCommand[] {
	return commands.colors?.commands || []
}

// Get commands for bubble menu (uses toolbar commands for proper icon/tooltip support)
export function getBubbleMenuCommands(): EdraToolBarCommands[] {
	const textFormattingCommands = toolbarCommands['text-formatting'] || []
	// Return only the essential formatting commands for bubble menu
	// Strip `clickable` — the bubble menu mounts hidden (via Tippy) so
	// editor.can() checks evaluate as false at mount time and never update.
	// The bubble menu's shouldShow already gates visibility on valid selections.
	return textFormattingCommands
		.filter((cmd) => ['bold', 'italic', 'strikethrough', 'link'].includes(cmd.name))
		.map(({ clickable, ...rest }) => rest)
}

// Commands to exclude from toolbar
export const excludedCommands = ['colors', 'fonts']

// Default placeholders by variant
export function getDefaultPlaceholder(variant: ComposerVariant): string {
	return variant === 'inline' ? "What's on your mind?" : 'Type "/" for commands...'
}

// Default min heights by variant
export function getDefaultMinHeight(variant: ComposerVariant): number {
	return variant === 'inline' ? 80 : 400
}

// Whether to show toolbar by default
export function shouldShowToolbar(variant: ComposerVariant): boolean {
	return variant === 'full'
}

// Whether to show slash commands
export function shouldShowSlashCommands(variant: ComposerVariant): boolean {
	return variant !== 'minimal'
}

// Whether to show bubble menu
export function shouldShowBubbleMenu(variant: ComposerVariant): boolean {
	return variant !== 'minimal'
}

// Default features by variant
export function getDefaultFeatures(variant: ComposerVariant): ComposerFeatures {
	if (variant === 'minimal') {
		return {
			imageUpload: false,
			mediaLibrary: false,
			urlEmbed: false,
			tables: false,
			codeBlocks: false,
			bubbleMenu: false,
			toolbar: true
		}
	}

	if (variant === 'inline') {
		return {
			imageUpload: true,
			mediaLibrary: true,
			urlEmbed: false,
			tables: false,
			codeBlocks: false,
			bubbleMenu: true,
			toolbar: false
		}
	}

	// Full variant
	return {
		imageUpload: true,
		mediaLibrary: true,
		urlEmbed: true,
		tables: true,
		codeBlocks: true,
		bubbleMenu: true,
		toolbar: false
	}
}
