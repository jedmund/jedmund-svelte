/**
 * Waveform extraction utility using Web Audio API.
 * Computes per-bar RMS amplitude from an audio file for visualization.
 */

export async function extractWaveformData(
	audioUrl: string,
	barCount = 48
): Promise<number[]> {
	const response = await fetch(audioUrl)
	const arrayBuffer = await response.arrayBuffer()

	const audioContext = new AudioContext()
	const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

	// Use the first channel
	const channelData = audioBuffer.getChannelData(0)
	const samplesPerBar = Math.floor(channelData.length / barCount)

	const bars: number[] = []
	for (let i = 0; i < barCount; i++) {
		const start = i * samplesPerBar
		const end = Math.min(start + samplesPerBar, channelData.length)

		// Compute RMS amplitude for this bar
		let sum = 0
		for (let j = start; j < end; j++) {
			sum += channelData[j] * channelData[j]
		}
		const rms = Math.sqrt(sum / (end - start))
		bars.push(rms)
	}

	// Normalize to 0–1 range
	const max = Math.max(...bars)
	if (max === 0) return bars.map(() => 0)

	await audioContext.close()

	return bars.map((v) => v / max)
}

export function generateDefaultWaveform(barCount = 48): number[] {
	// Produce a gentle wave pattern as a placeholder
	return Array.from({ length: barCount }, (_, i) => {
		const t = i / barCount
		return 0.3 + 0.2 * Math.sin(t * Math.PI * 4) + 0.1 * Math.sin(t * Math.PI * 7)
	})
}
