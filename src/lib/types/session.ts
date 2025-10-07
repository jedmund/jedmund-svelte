export interface SessionUser {
	username: string
}

export interface AdminSession {
	user: SessionUser
	expiresAt: number
}
