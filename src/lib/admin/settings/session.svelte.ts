import { api } from '../api'
import { toast } from '$lib/stores/toast'

export interface SettingMeta {
	hasValue: boolean
	source: 'db' | 'env' | 'none'
}
interface SettingsResponse {
	settings: Record<string, string>
	meta: Record<string, SettingMeta>
}
export interface TestResult {
	status: 'idle' | 'testing' | 'success' | 'error'
	message: string
}

export function createSettingsSession() {
	const state = $state({
		loading: true,
		saving: false,
		formValues: {} as Record<string, string>,
		meta: {} as Record<string, SettingMeta>,
		testResults: {} as Record<string, TestResult>
	})
	const controller = new AbortController()
	const timers = new Map<string, ReturnType<typeof setTimeout>>()
	const tests = new Map<string, number>()
	let disposed = false

	async function load() {
		try {
			const data = await api.get<SettingsResponse>('/api/admin/settings', {
				signal: controller.signal
			})
			if (!disposed) {
				state.formValues = data.settings
				state.meta = data.meta
			}
		} catch {
			if (!disposed) toast.error('Failed to load settings')
		} finally {
			if (!disposed) state.loading = false
		}
	}

	async function save() {
		if (disposed || state.saving) return
		state.saving = true
		const submitted = { ...state.formValues }
		try {
			const data = await api.put<SettingsResponse>('/api/admin/settings', submitted, {
				signal: controller.signal
			})
			if (disposed) return
			for (const [key, value] of Object.entries(data.settings)) {
				if (state.formValues[key] === submitted[key]) state.formValues[key] = value
			}
			state.meta = data.meta
			toast.success('Settings saved')
		} catch {
			if (!disposed) toast.error('Failed to save settings')
		} finally {
			if (!disposed) state.saving = false
		}
	}

	async function testConnection(service: string) {
		if (disposed || state.testResults[service]?.status === 'testing') return
		const version = (tests.get(service) ?? 0) + 1
		tests.set(service, version)
		clearTimeout(timers.get(service))
		state.testResults[service] = { status: 'testing', message: '' }
		try {
			const data = await api.post<{ success: boolean; message: string }>(
				'/api/admin/settings/test',
				{ service },
				{ signal: controller.signal }
			)
			if (!disposed && tests.get(service) === version)
				state.testResults[service] = {
					status: data.success ? 'success' : 'error',
					message: data.message
				}
		} catch {
			if (!disposed && tests.get(service) === version)
				state.testResults[service] = { status: 'error', message: 'Request failed' }
		}
		if (disposed) return
		timers.set(
			service,
			setTimeout(() => {
				if (tests.get(service) === version)
					state.testResults[service] = { status: 'idle', message: '' }
			}, 5000)
		)
	}

	return {
		state,
		load,
		save,
		testConnection,
		dispose() {
			disposed = true
			controller.abort()
			for (const timer of timers.values()) clearTimeout(timer)
		}
	}
}
