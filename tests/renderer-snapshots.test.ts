import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { renderCorpus } from '../scripts/lib/renderer-comparison.ts'

test('synthetic HTML, excerpts, album links and RSS match reviewed snapshots', async () => {
	const fixture = async (name: string) =>
		JSON.parse(await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))
	const documents = [...(await fixture('edra-documents')), ...(await fixture('edra-compatibility'))]
	assert.deepEqual(
		await renderCorpus(process.cwd(), documents),
		await fixture('renderer-snapshots')
	)
})
