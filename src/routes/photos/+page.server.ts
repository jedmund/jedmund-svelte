import type { PageServerLoad } from './$types'
import { getOffsetPaginationMeta } from '$lib/server/api-utils'

const PAGE_SIZE = 20

export const load: PageServerLoad = async ({ parent }) => {
	const { photoItems, photoItemsTotal } = await parent()
	return {
		photos: photoItems.slice(0, PAGE_SIZE),
		pagination: getOffsetPaginationMeta(photoItemsTotal, PAGE_SIZE, 0)
	}
}
