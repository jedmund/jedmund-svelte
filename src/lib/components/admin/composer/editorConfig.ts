import type { Editor } from '@tiptap/core'
import type { ComposerVariant, ComposerFeatures } from './types'
import { commands } from '$lib/components/edra/commands/commands.js'

export interface FilteredCommands {
	[key: string]: {
		name: string
		label: string
		commands: any[]
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
	features: ComposerFeatures
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
		const basicFormatting: any[] = []
		const advancedFormatting: any[] = []

		// Group basic formatting first
		const basicOrder = ['bold', 'italic', 'underline', 'strike']
		basicOrder.forEach((name) => {
			const cmd = allCommands.find((c: any) => c.name === name)
			if (cmd) basicFormatting.push(cmd)
		})

		// Then link and code
		const advancedOrder = ['link', 'code']
		advancedOrder.forEach((name) => {
			const cmd = allCommands.find((c: any) => c.name === name)
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
export function getMediaCommands(features: ComposerFeatures): any[] {
	if (!commands.media) return []

	let mediaCommands = [...commands.media.commands]

	// Filter based on features
	if (!features.urlEmbed) {
		mediaCommands = mediaCommands.filter((cmd) => cmd.name !== 'iframe-placeholder')
	}

	return mediaCommands
}

// Get color commands
export function getColorCommands(): any[] {
	return commands.colors?.commands || []
}

// Get commands for bubble menu
export function getBubbleMenuCommands(): any[] {
	const textFormattingCommands = commands['text-formatting']?.commands || []
	// Return only the essential formatting commands for bubble menu
	return textFormattingCommands.filter((cmd) =>
		['bold', 'italic', 'underline', 'strike', 'link'].includes(cmd.name)
	)
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
