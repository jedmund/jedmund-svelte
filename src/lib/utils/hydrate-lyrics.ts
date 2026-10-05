import { mount, unmount } from 'svelte'
import LyricsToggle from '$components/LyricsToggle.svelte'

/**
 * Adds the A / Both / B toggle to rendered `[data-lyrics]` blocks. The server
 * HTML stays control-free so RSS readers just see paired paragraphs.
 * Returns a cleanup function that removes the toggles again.
 */
export function hydrateLyrics(container: HTMLElement): () => void {
	const cleanups: Array<() => void> = []

	container.querySelectorAll<HTMLElement>('[data-lyrics]').forEach((figure) => {
		// A toggle only makes sense when both languages have something to show.
		if (!figure.querySelector('.lyrics-a') || !figure.querySelector('.lyrics-b')) return

		const target = document.createElement('div')
		target.className = 'lyrics-controls'
		figure.prepend(target)

		const component = mount(LyricsToggle, {
			target,
			props: {
				langA: figure.dataset.langA || 'ja',
				langB: figure.dataset.langB || 'en',
				onchange: (view) => {
					figure.dataset.view = view
				}
			}
		})

		cleanups.push(() => {
			unmount(component)
			target.remove()
			delete figure.dataset.view
		})
	})

	return () => cleanups.forEach((cleanup) => cleanup())
}
