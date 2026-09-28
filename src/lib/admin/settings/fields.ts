export const FIELD_HELP: Record<string, string> = {
	'site.name': 'Used in RSS feeds, admin panel, and as the default site identity',
	'site.url': 'Base URL for canonical links, RSS feeds, and syndicated posts',
	'seo.default_title': 'Shown on the homepage and as fallback for pages without specific titles',
	'seo.default_description':
		"Used in meta description and OpenGraph tags when a page doesn't set its own",
	'seo.default_og_image': "Default social sharing image when a page doesn't specify one",
	'seo.twitter_handle': 'Used in Twitter Card meta tags',
	'seo.locale': 'Language locale for OpenGraph tags',
	'lastfm.api_key': 'Required for fetching recent listening data',
	'cloudinary.cloud_name': 'Your Cloudinary cloud identifier',
	'cloudinary.api_key': 'Used for media uploads and asset management',
	'cloudinary.api_secret': 'Used for authenticated Cloudinary API requests',
	'apple_music.team_id': 'Apple Developer team ID for music API access',
	'apple_music.key_id': 'Key ID for the Apple Music API key',
	'apple_music.private_key': 'Private key for signing Apple Music API tokens',
	'bluesky.handle': 'Your Bluesky account handle for cross-posting',
	'bluesky.app_password': 'App password for Bluesky API authentication',
	'bluesky.did': 'Your Bluesky decentralized identifier',
	'mastodon.instance': 'Your Mastodon instance hostname for cross-posting',
	'mastodon.access_token': 'Access token for Mastodon API authentication'
}

export interface SettingsField {
	key: string
	label: string
	type?: 'password'
	placeholder?: string
	rows?: number
}
export interface SettingsSection {
	title?: string
	service?: string
	fields: SettingsField[]
}
export const SETTINGS_PANELS: { tab: string; sections: SettingsSection[] }[] = [
	{
		tab: 'general',
		sections: [
			{
				fields: [
					{
						key: 'site.name',
						label: 'Site Name'
					},
					{
						key: 'site.url',
						label: 'Site URL',
						placeholder: 'https://example.com'
					}
				]
			}
		]
	},
	{
		tab: 'seo',
		sections: [
			{
				fields: [
					{
						key: 'seo.default_title',
						label: 'Default Page Title'
					},
					{
						key: 'seo.default_description',
						label: 'Default Description',
						rows: 3
					},
					{
						key: 'seo.default_og_image',
						label: 'Default OG Image URL',
						placeholder: 'https://example.com/images/og-image.jpg'
					},
					{
						key: 'seo.twitter_handle',
						label: 'Twitter/X Handle',
						placeholder: '@handle'
					},
					{
						key: 'seo.locale',
						label: 'Locale',
						placeholder: 'en_US'
					}
				]
			}
		]
	},
	{
		tab: 'integrations',
		sections: [
			{
				fields: [
					{
						key: 'lastfm.api_key',
						label: 'API Key',
						type: 'password'
					}
				],
				title: 'Last.fm',
				service: 'lastfm'
			},
			{
				fields: [
					{
						key: 'cloudinary.cloud_name',
						label: 'Cloud Name'
					},
					{
						key: 'cloudinary.api_key',
						label: 'API Key',
						type: 'password'
					},
					{
						key: 'cloudinary.api_secret',
						label: 'API Secret',
						type: 'password'
					}
				],
				title: 'Cloudinary',
				service: 'cloudinary'
			},
			{
				fields: [
					{
						key: 'apple_music.team_id',
						label: 'Team ID',
						type: 'password'
					},
					{
						key: 'apple_music.key_id',
						label: 'Key ID',
						type: 'password'
					},
					{
						key: 'apple_music.private_key',
						label: 'Private Key',
						rows: 4
					}
				],
				title: 'Apple Music',
				service: 'apple_music'
			}
		]
	},
	{
		tab: 'syndication',
		sections: [
			{
				fields: [
					{
						key: 'bluesky.handle',
						label: 'Handle',
						placeholder: 'user.bsky.social'
					},
					{
						key: 'bluesky.app_password',
						label: 'App Password',
						type: 'password'
					},
					{
						key: 'bluesky.did',
						label: 'DID',
						placeholder: 'did:plc:...'
					}
				],
				title: 'Bluesky',
				service: 'bluesky'
			},
			{
				fields: [
					{
						key: 'mastodon.instance',
						label: 'Instance',
						placeholder: 'mastodon.social'
					},
					{
						key: 'mastodon.access_token',
						label: 'Access Token',
						type: 'password'
					}
				],
				title: 'Mastodon',
				service: 'mastodon'
			}
		]
	}
]
