// Simple admin authentication helper for client-side use
// In a real application, this would use proper JWT tokens or session cookies

let adminCredentials: string | null = null

// Initialize auth (call this when the admin logs in)
export function setAdminAuth(username: string, password: string) {
	adminCredentials = btoa(`${username}:${password}`)
}

// Get auth headers for API requests
export function getAuthHeaders(): HeadersInit {
	if (!adminCredentials) {
		// For development, use default credentials
		// In production, this should redirect to login
		adminCredentials = btoa('admin:localdev')
	}

	return {
		Authorization: `Basic ${adminCredentials}`
	}
}

// Check if user is authenticated (basic check)
export function isAuthenticated(): boolean {
	return adminCredentials !== null
}

// Clear auth (logout)
export function clearAuth() {
	adminCredentials = null
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
