import { mount, unmount } from 'svelte'
import AudioPlayer from '$components/AudioPlayer.svelte'

interface MountedPlayer {
	component: Record<string, unknown>
	target: HTMLElement
}

/**
 * Finds all `[data-audio-player]` placeholder divs in the container
 * and mounts AudioPlayer instances with props from data attributes.
 * Returns a cleanup function that unmounts all instances.
 */
export function hydrateAudioPlayers(container: HTMLElement): () => void {
	const players: MountedPlayer[] = []

	const placeholders = container.querySelectorAll<HTMLElement>('[data-audio-player]')
	placeholders.forEach((el) => {
		const src = el.dataset.src || ''
		const title = el.dataset.title || ''
		const waveformRaw = el.dataset.waveform
		const waveformData = waveformRaw ? JSON.parse(waveformRaw) as number[] : null

		if (!src) return

		const component = mount(AudioPlayer, {
			target: el,
			props: {
				src,
				title,
				waveformData
			}
		})

		players.push({ component, target: el })
	})

	return () => {
		players.forEach(({ component }) => {
			unmount(component)
		})
	}
}
