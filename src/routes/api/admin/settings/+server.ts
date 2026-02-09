import type { RequestHandler } from './$types'
import { checkAdminAuth, jsonResponse, errorResponse } from '$lib/server/api-utils'
import { getAllSettings, getSettingMeta, setConfig, invalidateConfigCache } from '$lib/server/config'

const MASKED_VALUE = '••••••••'

export const GET: RequestHandler = async (event) => {
	if (!checkAdminAuth(event)) {
		return errorResponse('Unauthorized', 401)
	}

	const settings = await getAllSettings()
	const meta = await getSettingMeta()

	return jsonResponse({ settings, meta })
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
		// Skip masked values — user didn't change them
		if (value === MASKED_VALUE) continue
		// Skip empty strings — don't store blank settings
		if (value === '') continue

		await setConfig(key, value)
	}

	invalidateConfigCache()

	const settings = await getAllSettings()
	const meta = await getSettingMeta()

	return jsonResponse({ settings, meta })
}
