import { api } from './api'
import type { GardenItem } from '@prisma/client'

export async function loadGardenItems(signal: AbortSignal) {
	const data = await api.get<{ items: GardenItem[] }>('/api/admin/garden', { signal })
	return data.items
}
export function deleteGardenItem(id: number, signal: AbortSignal) {
	return api.delete(`/api/admin/garden/${id}`, { signal })
}
