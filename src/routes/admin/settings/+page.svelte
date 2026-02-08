<script lang="ts">
	import { onMount } from 'svelte'
	import { api } from '$lib/admin/api'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import Input from '$lib/components/admin/Input.svelte'
	import Textarea from '$lib/components/admin/Textarea.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import CheckIcon from '$icons/check.svg?component'
	import XIcon from '$icons/x.svg?component'

	interface SettingMeta {
		hasValue: boolean
		source: 'db' | 'env' | 'none'
	}

	interface SettingsResponse {
		settings: Record<string, string>
		meta: Record<string, SettingMeta>
	}

	interface TestResult {
		status: 'idle' | 'testing' | 'success' | 'error'
		message: string
	}

	// All setting keys — must be initialized to avoid bind:value={undefined}
	const ALL_KEYS = [
		'site.name',
		'site.url',
		'seo.default_title',
		'seo.default_description',
		'seo.default_og_image',
		'seo.twitter_handle',
		'seo.locale',
		'lastfm.api_key',
		'cloudinary.cloud_name',
		'cloudinary.api_key',
		'cloudinary.api_secret',
		'apple_music.team_id',
		'apple_music.key_id',
		'apple_music.private_key',
		'bluesky.handle',
		'bluesky.app_password',
		'bluesky.did',
		'mastodon.instance',
		'mastodon.access_token'
	]

	const FIELD_HELP: Record<string, string> = {
		'site.name': 'Used in RSS feeds, admin panel, and as the default site identity',
		'site.url': 'Base URL for canonical links, RSS feeds, and syndicated posts',
		'seo.default_title':
			'Shown on the homepage and as fallback for pages without specific titles',
		'seo.default_description':
			"Used in meta description and OpenGraph tags when a page doesn't set its own",
		'seo.default_og_image':
			"Default social sharing image when a page doesn't specify one",
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

	function emptyFormValues(): Record<string, string> {
		const values: Record<string, string> = {}
		for (const key of ALL_KEYS) values[key] = ''
		return values
	}

	let loading = $state(true)
	let saving = $state(false)
	let activeTab = $state('general')
	let formValues = $state<Record<string, string>>(emptyFormValues())
	let meta = $state<Record<string, SettingMeta>>({})
	let saveMessage = $state('')
	let testResults = $state<Record<string, TestResult>>({})

	const tabOptions = [
		{ value: 'general', label: 'General' },
		{ value: 'seo', label: 'SEO' },
		{ value: 'integrations', label: 'Integrations' },
		{ value: 'syndication', label: 'Syndication' }
	]

	function helpText(key: string): string | undefined {
		const m = meta[key]
		if (m?.source === 'env') return 'Currently using environment variable'
		return FIELD_HELP[key]
	}

	async function testConnection(service: string) {
		testResults[service] = { status: 'testing', message: '' }

		try {
			const data = await api.post<{ success: boolean; message: string }>(
				'/api/admin/settings/test',
				{ service }
			)
			if (data) {
				testResults[service] = {
					status: data.success ? 'success' : 'error',
					message: data.message
				}
			}
		} catch {
			testResults[service] = { status: 'error', message: 'Request failed' }
		}

		setTimeout(() => {
			testResults[service] = { status: 'idle', message: '' }
		}, 5000)
	}

	onMount(async () => {
		await loadSettings()
	})

	async function loadSettings() {
		try {
			const data = await api.get<SettingsResponse>('/api/admin/settings')
			if (data) {
				formValues = { ...emptyFormValues(), ...data.settings }
				meta = data.meta
			}
		} catch (error) {
			console.error('Failed to load settings:', error)
		} finally {
			loading = false
		}
	}

	async function handleSave() {
		saving = true
		saveMessage = ''

		try {
			const data = await api.put<SettingsResponse>('/api/admin/settings', formValues)
			if (data) {
				formValues = { ...emptyFormValues(), ...data.settings }
				meta = data.meta
				saveMessage = 'Settings saved'
				setTimeout(() => (saveMessage = ''), 3000)
			}
		} catch (error) {
			console.error('Failed to save settings:', error)
			saveMessage = 'Failed to save'
			setTimeout(() => (saveMessage = ''), 3000)
		} finally {
			saving = false
		}
	}
</script>

<svelte:head>
	<title>Settings - Admin @jedmund</title>
</svelte:head>

<AdminPage>
	{#snippet header()}
		<header>
			<div class="header-left">
				<h1 class="page-title">Settings</h1>
			</div>
			<div class="header-center">
				<AdminSegmentedControl
					options={tabOptions}
					value={activeTab}
					onChange={(value) => (activeTab = value)}
				/>
			</div>
			<div class="header-actions">
				{#if saveMessage}
					<span class="save-message">{saveMessage}</span>
				{/if}
				<button class="btn btn-primary" onclick={handleSave} disabled={saving}>
					{saving ? 'Saving...' : 'Save'}
				</button>
			</div>
		</header>
	{/snippet}

	<div class="settings-container">
		{#if loading}
			<div class="loading-container">
				<LoadingSpinner />
			</div>
		{:else}
			<div class="tab-panels">
				<!-- General -->
				<div class="panel" class:active={activeTab === 'general'}>
					<div class="form-section">
						<Input
							label="Site Name"
							bind:value={formValues['site.name']}
							helpText={helpText('site.name')}
						/>
						<Input
							label="Site URL"
							bind:value={formValues['site.url']}
							helpText={helpText('site.url')}
							placeholder="https://example.com"
						/>
					</div>
				</div>

				<!-- SEO -->
				<div class="panel" class:active={activeTab === 'seo'}>
					<div class="form-section">
						<Input
							label="Default Page Title"
							bind:value={formValues['seo.default_title']}
							helpText={helpText('seo.default_title')}
						/>
						<Textarea
							label="Default Description"
							bind:value={formValues['seo.default_description']}
							rows={3}
							helpText={helpText('seo.default_description')}
						/>
						<Input
							label="Default OG Image URL"
							bind:value={formValues['seo.default_og_image']}
							helpText={helpText('seo.default_og_image')}
							placeholder="https://example.com/images/og-image.jpg"
						/>
						<Input
							label="Twitter/X Handle"
							bind:value={formValues['seo.twitter_handle']}
							helpText={helpText('seo.twitter_handle')}
							placeholder="@handle"
						/>
						<Input
							label="Locale"
							bind:value={formValues['seo.locale']}
							helpText={helpText('seo.locale')}
							placeholder="en_US"
						/>
					</div>
				</div>

				<!-- Integrations -->
				<div class="panel" class:active={activeTab === 'integrations'}>
					<div class="form-section">
						<div class="section-header">
							<h3>Last.fm</h3>
							<div class="test-action">
								{#if testResults['lastfm']?.status === 'success'}
									<span class="test-result test-success">
										<CheckIcon />
										Connected
									</span>
								{:else if testResults['lastfm']?.status === 'error'}
									<span class="test-result test-error">
										<XIcon />
										{testResults['lastfm'].message}
									</span>
								{:else}
									<Button
										variant="secondary"
										buttonSize="small"
										loading={testResults['lastfm']?.status === 'testing'}
										onclick={() => testConnection('lastfm')}
									>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
						<Input
							label="API Key"
							type="password"
							bind:value={formValues['lastfm.api_key']}
							helpText={helpText('lastfm.api_key')}
						/>
					</div>

					<div class="form-section">
						<div class="section-header">
							<h3>Cloudinary</h3>
							<div class="test-action">
								{#if testResults['cloudinary']?.status === 'success'}
									<span class="test-result test-success">
										<CheckIcon />
										Connected
									</span>
								{:else if testResults['cloudinary']?.status === 'error'}
									<span class="test-result test-error">
										<XIcon />
										{testResults['cloudinary'].message}
									</span>
								{:else}
									<Button
										variant="secondary"
										buttonSize="small"
										loading={testResults['cloudinary']?.status === 'testing'}
										onclick={() => testConnection('cloudinary')}
									>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
						<Input
							label="Cloud Name"
							bind:value={formValues['cloudinary.cloud_name']}
							helpText={helpText('cloudinary.cloud_name')}
						/>
						<Input
							label="API Key"
							type="password"
							bind:value={formValues['cloudinary.api_key']}
							helpText={helpText('cloudinary.api_key')}
						/>
						<Input
							label="API Secret"
							type="password"
							bind:value={formValues['cloudinary.api_secret']}
							helpText={helpText('cloudinary.api_secret')}
						/>
					</div>

					<div class="form-section">
						<div class="section-header">
							<h3>Apple Music</h3>
							<div class="test-action">
								{#if testResults['apple_music']?.status === 'success'}
									<span class="test-result test-success">
										<CheckIcon />
										Connected
									</span>
								{:else if testResults['apple_music']?.status === 'error'}
									<span class="test-result test-error">
										<XIcon />
										{testResults['apple_music'].message}
									</span>
								{:else}
									<Button
										variant="secondary"
										buttonSize="small"
										loading={testResults['apple_music']?.status === 'testing'}
										onclick={() => testConnection('apple_music')}
									>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
						<Input
							label="Team ID"
							type="password"
							bind:value={formValues['apple_music.team_id']}
							helpText={helpText('apple_music.team_id')}
						/>
						<Input
							label="Key ID"
							type="password"
							bind:value={formValues['apple_music.key_id']}
							helpText={helpText('apple_music.key_id')}
						/>
						<Textarea
							label="Private Key"
							bind:value={formValues['apple_music.private_key']}
							rows={4}
							helpText={helpText('apple_music.private_key')}
						/>
					</div>
				</div>

				<!-- Syndication -->
				<div class="panel" class:active={activeTab === 'syndication'}>
					<div class="form-section">
						<div class="section-header">
							<h3>Bluesky</h3>
							<div class="test-action">
								{#if testResults['bluesky']?.status === 'success'}
									<span class="test-result test-success">
										<CheckIcon />
										Connected
									</span>
								{:else if testResults['bluesky']?.status === 'error'}
									<span class="test-result test-error">
										<XIcon />
										{testResults['bluesky'].message}
									</span>
								{:else}
									<Button
										variant="secondary"
										buttonSize="small"
										loading={testResults['bluesky']?.status === 'testing'}
										onclick={() => testConnection('bluesky')}
									>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
						<Input
							label="Handle"
							bind:value={formValues['bluesky.handle']}
							helpText={helpText('bluesky.handle')}
							placeholder="user.bsky.social"
						/>
						<Input
							label="App Password"
							type="password"
							bind:value={formValues['bluesky.app_password']}
							helpText={helpText('bluesky.app_password')}
						/>
						<Input
							label="DID"
							bind:value={formValues['bluesky.did']}
							helpText={helpText('bluesky.did')}
							placeholder="did:plc:..."
						/>
					</div>

					<div class="form-section">
						<div class="section-header">
							<h3>Mastodon</h3>
							<div class="test-action">
								{#if testResults['mastodon']?.status === 'success'}
									<span class="test-result test-success">
										<CheckIcon />
										Connected
									</span>
								{:else if testResults['mastodon']?.status === 'error'}
									<span class="test-result test-error">
										<XIcon />
										{testResults['mastodon'].message}
									</span>
								{:else}
									<Button
										variant="secondary"
										buttonSize="small"
										loading={testResults['mastodon']?.status === 'testing'}
										onclick={() => testConnection('mastodon')}
									>
										Test Connection
									</Button>
								{/if}
							</div>
						</div>
						<Input
							label="Instance"
							bind:value={formValues['mastodon.instance']}
							helpText={helpText('mastodon.instance')}
							placeholder="mastodon.social"
						/>
						<Input
							label="Access Token"
							type="password"
							bind:value={formValues['mastodon.access_token']}
							helpText={helpText('mastodon.access_token')}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>
</AdminPage>

<style lang="scss">
	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		.header-left {
			width: 250px;
			display: flex;
			align-items: center;
		}

		.header-center {
			display: flex;
			justify-content: center;
			align-items: center;
		}

		.header-actions {
			width: 250px;
			display: flex;
			justify-content: flex-end;
			align-items: center;
			gap: $unit-2x;
		}
	}

	.page-title {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: $gray-20;
	}

	.save-message {
		font-size: 0.875rem;
		color: $gray-40;
		white-space: nowrap;
	}

	.settings-container {
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.tab-panels {
		.panel {
			display: none;

			&.active {
				display: block;
			}
		}
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
		margin-bottom: $unit-4x;

		h3 {
			margin: 0;
			font-size: 0.875rem;
			font-weight: 600;
			color: $gray-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.test-action {
		display: flex;
		align-items: center;
	}

	.test-result {
		display: inline-flex;
		align-items: center;
		gap: $unit-half;
		font-size: 0.8125rem;
		font-weight: 500;

		:global(svg) {
			width: 14px;
			height: 14px;
		}
	}

	.test-success {
		color: $success-text;
	}

	.test-error {
		color: $error-color;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: $unit $unit-2x;
		border-radius: $corner-radius-lg;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.2s ease;

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.btn-primary {
		background-color: $red-60;
		color: white;

		&:hover:not(:disabled) {
			background-color: $red-70;
		}
	}
</style>
