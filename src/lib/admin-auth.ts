// Simple admin authentication helper for client-side use
// In a real application, this would use proper JWT tokens or session cookies

let adminCredentials: string | null = null

// Initialize auth (call this when the admin logs in)
export function setAdminAuth(username: string, password: string) {
	adminCredentials = btoa(`${username}:${password}`)
}

// Get auth headers for API requests
export function getAuthHeaders(): HeadersInit {
	// First try to get from localStorage (where login stores it)
	const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null
	if (storedAuth) {
		return {
			Authorization: `Basic ${storedAuth}`
		}
	}

	// Fall back to in-memory credentials if set
	if (adminCredentials) {
		return {
			Authorization: `Basic ${adminCredentials}`
		}
	}

	// Development fallback
	const fallbackAuth = btoa('admin:localdev')
	return {
		Authorization: `Basic ${fallbackAuth}`
	}
}

// Check if user is authenticated (basic check)
export function isAuthenticated(): boolean {
	const storedAuth = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') : null
	return storedAuth !== null || adminCredentials !== null
}

// Clear auth (logout)
export function clearAuth() {
	adminCredentials = null
	if (typeof window !== 'undefined') {
		localStorage.removeItem('admin_auth')
	}
}

// Make authenticated API request
export async function authenticatedFetch(
	url: string,
	options: RequestInit = {}
): Promise<Response> {
	const headers = {
		...getAuthHeaders(),
		...options.headers
	}

	return fetch(url, {
		...options,
		headers
	})
}
