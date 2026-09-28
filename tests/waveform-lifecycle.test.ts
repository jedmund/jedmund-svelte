import assert from 'node:assert/strict'
import test from 'node:test'
import { extractWaveformData } from '../src/lib/utils/waveform.ts'

test('waveform decoding closes the audio context on silence, success, and decode failure', async () => {
	const originalContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext')
	const originalFetch = globalThis.fetch
	let closes = 0
	let fail = false
	let channel = new Float32Array([0, 0, 0, 0])
	class FakeContext {
		async decodeAudioData() {
			if (fail) throw new Error('bad audio')
			return { getChannelData: () => channel }
		}
		async close() {
			closes++
		}
	}
	Object.defineProperty(globalThis, 'AudioContext', { value: FakeContext, configurable: true })
	globalThis.fetch = async () => new Response(new Uint8Array([1, 2]))
	try {
		assert.deepEqual(await extractWaveformData('synthetic', 2), [0, 0])
		assert.equal(closes, 1)
		channel = new Float32Array([1, 1, 0.5, 0.5])
		assert.deepEqual(await extractWaveformData('synthetic', 2), [1, 0.5])
		assert.equal(closes, 2)
		fail = true
		await assert.rejects(extractWaveformData('synthetic', 2), /bad audio/)
		assert.equal(closes, 3)
	} finally {
		globalThis.fetch = originalFetch
		if (originalContext) Object.defineProperty(globalThis, 'AudioContext', originalContext)
		else Reflect.deleteProperty(globalThis, 'AudioContext')
	}
})
