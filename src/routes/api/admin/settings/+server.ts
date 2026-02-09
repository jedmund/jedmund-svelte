import type { RequestHandler } from './$types'
import { checkAdminAuth, jsonResponse, errorResponse } from '$lib/server/api-utils'
import { getAllSettings, setConfig, invalidateConfigCache, SETTING_DEFINITIONS } from '$lib/server/config'

const MASKED_VALUE = '••••••••'
const VALID_KEYS = new Set(SETTING_DEFINITIONS.map((d) => d.key))

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const { values, meta } = await getAllSettings()
	return jsonResponse({ settings: values, meta })
}

export const PUT: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	let body: Record<string, string>
	try {
		body = await event.request.json()
	} catch {
		return errorResponse('Invalid JSON', 400)
	}

	for (const [key, value] of Object.entries(body)) {
		if (!VALID_KEYS.has(key)) continue
		if (value === MASKED_VALUE) continue
		if (value === '') continue

		await setConfig(key, value)
	}

	invalidateConfigCache()

	const { values, meta } = await getAllSettings()
	return jsonResponse({ settings: values, meta })
}
