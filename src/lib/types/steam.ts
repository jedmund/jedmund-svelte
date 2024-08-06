type SerializableGameInfo = {
	id: number | string | null
	name: string
	playtime: string | number | undefined
	lastPlayed: Date | undefined
	coverURL: string
	platform: 'steam' | 'psn'
}
