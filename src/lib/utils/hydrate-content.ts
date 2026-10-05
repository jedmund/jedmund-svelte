import { hydrateAudioPlayers } from './hydrate-audio-players'

/** Mounts every interactive island in rendered post HTML; returns a combined cleanup. */
export function hydrateContent(container: HTMLElement): () => void {
	const cleanups = [hydrateAudioPlayers(container)]
	return () => cleanups.forEach((cleanup) => cleanup())
}
