import { writable, derived, get } from 'svelte/store'

interface AudioPreviewState {
	currentAudio: HTMLAudioElement | null
	currentAlbumId: string | null
	isPlaying: boolean
}

function createAudioPreviewStore() {
	const { subscribe, set, update } = writable<AudioPreviewState>({
		currentAudio: null,
		currentAlbumId: null,
		isPlaying: false
	})

	return {
		subscribe,
		play: (audio: HTMLAudioElement, albumId: string) => {
			update(state => {
				// Pause any currently playing audio
				if (state.currentAudio && state.currentAudio !== audio) {
					state.currentAudio.pause()
				}
				return {
					currentAudio: audio,
					currentAlbumId: albumId,
					isPlaying: true
				}
			})
		},
		stop: () => {
			update(state => {
				if (state.currentAudio) {
					state.currentAudio.pause()
				}
				return {
					currentAudio: null,
					currentAlbumId: null,
					isPlaying: false
				}
			})
		}
	}
}

export const audioPreview = createAudioPreviewStore()