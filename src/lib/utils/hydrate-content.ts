import { hydrateAudioPlayers } from './hydrate-audio-players'
import { hydrateLyrics } from './hydrate-lyrics'

/** Mounts every interactive island in rendered post HTML; returns a combined cleanup. */
export function hydrateContent(container: HTMLElement): () => void {
	const cleanups = [hydrateAudioPlayers(container), hydrateLyrics(container)]
	return () => cleanups.forEach((cleanup) => cleanup())
}
