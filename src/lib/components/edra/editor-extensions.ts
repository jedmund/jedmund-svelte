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
import { GalleryPlaceholder } from './extensions/gallery/GalleryPlaceholder.js';
import { GalleryExtended } from './extensions/gallery/GalleryExtended.js';
import { GeolocationPlaceholder } from './extensions/geolocation/GeolocationPlaceholder.js';
import { GeolocationExtended } from './extensions/geolocation/GeolocationExtended.js';
import { IFramePlaceholder } from './extensions/iframe/IFramePlaceholder.js';
import { IFrameExtended } from './extensions/iframe/IFrameExtended.js';
import { UrlEmbedPlaceholder } from './extensions/url-embed/UrlEmbedPlaceholder.js';
import { UrlEmbedExtended } from './extensions/url-embed/UrlEmbedExtended.js';
import { UrlEmbed } from './extensions/url-embed/UrlEmbed.js';
import { LinkContextMenu } from './extensions/link-context-menu/LinkContextMenu.js';
import slashcommand from './extensions/slash-command/slashcommand.js';

// Component imports
import AudioPlaceholderComponent from './headless/components/AudioPlaceholder.svelte';
import AudioExtendedComponent from './headless/components/AudioExtended.svelte';
import ImagePlaceholderComponent from './headless/components/ImagePlaceholder.svelte';
import ImageExtendedComponent from './headless/components/ImageExtended.svelte';
import VideoPlaceholderComponent from './headless/components/VideoPlaceholder.svelte';
import VideoExtendedComponent from './headless/components/VideoExtended.svelte';
import GalleryPlaceholderComponent from './headless/components/GalleryPlaceholder.svelte';
import GalleryExtendedComponent from './headless/components/GalleryExtended.svelte';
import GeolocationPlaceholderComponent from './headless/components/GeolocationPlaceholder.svelte';
import GeolocationExtendedComponent from './headless/components/GeolocationExtended.svelte';
import IFramePlaceholderComponent from './headless/components/IFramePlaceholder.svelte';
import IFrameExtendedComponent from './headless/components/IFrameExtended.svelte';
import UrlEmbedPlaceholderComponent from './headless/components/UrlEmbedPlaceholder.svelte';
import UrlEmbedExtendedComponent from './headless/components/UrlEmbedExtended.svelte';
import SlashCommandList from './headless/components/SlashCommandList.svelte';

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
		VideoExtended(VideoExtendedComponent),
		// Gallery extension
		GalleryPlaceholder(GalleryPlaceholderComponent),
		GalleryExtended(GalleryExtendedComponent),
		// Geolocation extension with Leaflet maps
		GeolocationPlaceholder(GeolocationPlaceholderComponent),
		GeolocationExtended(GeolocationExtendedComponent),
		// IFrame extension
		IFramePlaceholder(IFramePlaceholderComponent),
		IFrameExtended(IFrameExtendedComponent),
		// URL Embed extension with optional callback
		UrlEmbedPlaceholder(UrlEmbedPlaceholderComponent),
		UrlEmbedExtended(UrlEmbedExtendedComponent)
	];

	// Add URL Embed extension with dropdown callback if provided
	if (onShowUrlConvertDropdown) {
		extensions.push(
			UrlEmbed.configure({
				onShowDropdown: onShowUrlConvertDropdown
			})
		);
	}

	// Add Link Context Menu with callback if provided
	if (onShowLinkContextMenu) {
		extensions.push(
			LinkContextMenu.configure({
				onShowContextMenu: onShowLinkContextMenu
			})
		);
	}

	// Add slash commands if enabled
	if (showSlashCommands) {
		extensions.push(slashcommand(SlashCommandList));
	}

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
