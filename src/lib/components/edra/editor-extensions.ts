import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import { SvelteNodeViewRenderer } from 'svelte-tiptap'
import type { Extensions } from '@tiptap/core'

// Extension classes
import { AudioPlaceholder } from './extensions/audio/AudioPlaceholder.js'
import { ImagePlaceholder } from './extensions/image/ImagePlaceholder.js'
import { VideoPlaceholder } from './extensions/video/VideoPlaceholder.js'
import { AudioExtended } from './extensions/audio/AudiExtended.js'
import { ImageExtended } from './extensions/image/ImageExtended.js'
import { VideoExtended } from './extensions/video/VideoExtended.js'
import { GalleryPlaceholder } from './extensions/gallery/GalleryPlaceholder.js'
import { GalleryExtended } from './extensions/gallery/GalleryExtended.js'
import { IFramePlaceholder } from './extensions/iframe/IFramePlaceholder.js'
import { IFrameExtended } from './extensions/iframe/IFrameExtended.js'
import { UrlEmbed } from './extensions/url-embed/UrlEmbed.js'
import { UrlEmbedPlaceholder } from './extensions/url-embed/UrlEmbedPlaceholder.js'
import { UrlEmbedExtended } from './extensions/url-embed/UrlEmbedExtended.js'
import { LinkContextMenu } from './extensions/link-context-menu/LinkContextMenu.js'
import { GeolocationPlaceholder } from './extensions/geolocation/GeolocationPlaceholder.js'
import { GeolocationExtended } from './extensions/geolocation/GeolocationExtended.js'
import slashcommand from './extensions/slash-command/slashcommand.js'

// Component imports
import CodeExtended from './headless/components/CodeExtended.svelte'
import AudioPlaceholderComponent from './headless/components/AudioPlaceholder.svelte'
import AudioExtendedComponent from './headless/components/AudioExtended.svelte'
import ImagePlaceholderComponent from './headless/components/ImagePlaceholder.svelte'
import ImageExtendedComponent from './headless/components/ImageExtended.svelte'
import VideoPlaceholderComponent from './headless/components/VideoPlaceholder.svelte'
import VideoExtendedComponent from './headless/components/VideoExtended.svelte'
import GalleryPlaceholderComponent from './headless/components/GalleryPlaceholder.svelte'
import GalleryExtendedComponent from './headless/components/GalleryExtended.svelte'
import IFramePlaceholderComponent from './headless/components/IFramePlaceholder.svelte'
import IFrameExtendedComponent from './headless/components/IFrameExtended.svelte'
import UrlEmbedPlaceholderComponent from './headless/components/UrlEmbedPlaceholder.svelte'
import UrlEmbedExtendedComponent from './headless/components/UrlEmbedExtended.svelte'
import GeolocationPlaceholderComponent from './headless/components/GeolocationPlaceholder.svelte'
import GeolocationExtendedComponent from './headless/components/GeolocationExtended.svelte'
import SlashCommandList from './headless/components/SlashCommandList.svelte'

// Create lowlight instance
const lowlight = createLowlight(all)

export interface EditorExtensionOptions {
	showSlashCommands?: boolean
	onShowUrlConvertDropdown?: (pos: number, url: string) => void
	onShowLinkContextMenu?: (pos: number, url: string, coords: { x: number; y: number }) => void
	imagePlaceholderComponent?: any // Allow custom image placeholder component
}

export function getEditorExtensions(options: EditorExtensionOptions = {}): Extensions {
	const {
		showSlashCommands = true,
		onShowUrlConvertDropdown,
		onShowLinkContextMenu,
		imagePlaceholderComponent = ImagePlaceholderComponent
	} = options

	const extensions: Extensions = [
		CodeBlockLowlight.configure({
			lowlight
		}).extend({
			addNodeView() {
				return SvelteNodeViewRenderer(CodeExtended)
			}
		}),
		AudioPlaceholder(AudioPlaceholderComponent),
		ImagePlaceholder(imagePlaceholderComponent),
		VideoPlaceholder(VideoPlaceholderComponent),
		AudioExtended(AudioExtendedComponent),
		ImageExtended(ImageExtendedComponent),
		VideoExtended(VideoExtendedComponent),
		GalleryPlaceholder(GalleryPlaceholderComponent),
		GalleryExtended(GalleryExtendedComponent),
		IFramePlaceholder(IFramePlaceholderComponent),
		IFrameExtended(IFrameExtendedComponent),
		GeolocationPlaceholder(GeolocationPlaceholderComponent),
		GeolocationExtended(GeolocationExtendedComponent)
	]

	// Add URL embed extensions with callbacks if provided
	if (onShowUrlConvertDropdown) {
		extensions.push(
			UrlEmbed.configure({ onShowDropdown: onShowUrlConvertDropdown }),
			UrlEmbedPlaceholder(UrlEmbedPlaceholderComponent),
			UrlEmbedExtended(UrlEmbedExtendedComponent)
		)
	} else {
		extensions.push(
			UrlEmbed,
			UrlEmbedPlaceholder(UrlEmbedPlaceholderComponent),
			UrlEmbedExtended(UrlEmbedExtendedComponent)
		)
	}

	// Add link context menu if callback provided
	if (onShowLinkContextMenu) {
		extensions.push(LinkContextMenu.configure({ onShowContextMenu: onShowLinkContextMenu }))
	} else {
		extensions.push(LinkContextMenu)
	}

	// Add slash commands if enabled
	if (showSlashCommands) {
		extensions.push(slashcommand(SlashCommandList))
	}

	return extensions
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
}
