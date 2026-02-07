import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { all, createLowlight } from 'lowlight';
import { SvelteNodeViewRenderer } from 'svelte-tiptap';
import type { Extensions, Editor, EditorOptions, Content } from '@tiptap/core';
import type { Component } from 'svelte';

// Extension classes
import { AudioPlaceholder } from './extensions/audio/AudioPlaceholder.js';
import { ImagePlaceholder } from './extensions/image/ImagePlaceholder.js';
import { VideoPlaceholder } from './extensions/video/VideoPlaceholder.js';
import { AudioExtended } from './extensions/audio/AudiExtended.js';
import { ImageExtended } from './extensions/image/ImageExtended.js';
import { VideoExtended } from './extensions/video/VideoExtended.js';

// Component imports
import AudioPlaceholderComponent from './headless/components/AudioPlaceholder.svelte';
import AudioExtendedComponent from './headless/components/AudioExtended.svelte';
import ImagePlaceholderComponent from './headless/components/ImagePlaceholder.svelte';
import ImageExtendedComponent from './headless/components/ImageExtended.svelte';
import VideoPlaceholderComponent from './headless/components/VideoPlaceholder.svelte';
import VideoExtendedComponent from './headless/components/VideoExtended.svelte';

// Create lowlight instance
const lowlight = createLowlight(all);

export interface EditorExtensionOptions {
	showSlashCommands?: boolean;
	onShowUrlConvertDropdown?: (pos: number, url: string) => void;
	onShowLinkContextMenu?: (pos: number, url: string, coords: { x: number; y: number }) => void;
	imagePlaceholderComponent?: Component;
}

export function getEditorExtensions(options: EditorExtensionOptions = {}): Extensions {
	const {
		showSlashCommands = true,
		onShowUrlConvertDropdown,
		onShowLinkContextMenu,
		imagePlaceholderComponent = ImagePlaceholderComponent
	} = options;

	const extensions: Extensions = [
		CodeBlockLowlight.configure({
			lowlight
		}),
		// Media extensions - using our unified placeholder pattern
		AudioPlaceholder(AudioPlaceholderComponent),
		ImagePlaceholder(imagePlaceholderComponent),
		VideoPlaceholder(VideoPlaceholderComponent),
		AudioExtended(AudioExtendedComponent),
		ImageExtended(ImageExtendedComponent),
		VideoExtended(VideoExtendedComponent)
	];

	// TODO: Add back when we migrate these extensions:
	// - Gallery (custom, doesn't exist in upstream)
	// - IFrame
	// - URL Embed (with dropdown callback)
	// - Geolocation (Leaflet maps)
	// - Link Context Menu (with callback)
	// - Slash Commands

	return extensions;
}

// Simple editor initialization function
// This wraps the default editor export to maintain backward compatibility
import createEditorDefault from './editor.js';

export function initiateEditor(
	element?: HTMLElement,
	content?: Content,
	extensions?: Extensions,
	options?: Partial<EditorOptions>
): Editor {
	return createEditorDefault(element, content, extensions, options);
}

// Extension presets for different editor variants
export const EDITOR_PRESETS = {
	full: {
		showSlashCommands: true,
		includeAllExtensions: true
	},
	inline: {
		showSlashCommands: true,
		includeAllExtensions: true
	},
	minimal: {
		showSlashCommands: false,
		includeAllExtensions: false
	}
};
