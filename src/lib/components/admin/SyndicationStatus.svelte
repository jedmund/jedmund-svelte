<script lang="ts">
	interface SyndicationRecord {
		id: number
		platform: string
		status: string
		externalUrl: string | null
		errorMessage: string | null
		createdAt: string
	}

	interface SyndicationStatusProps {
		contentType: string
		contentId: number
		contentStatus: string
	}

	let { contentType, contentId, contentStatus }: SyndicationStatusProps = $props()

	let syndications = $state<SyndicationRecord[]>([])
	let loading = $state(false)
	let triggering = $state(false)
	let editingPlatform = $state<string | null>(null)
	let editUrl = $state('')
	let addingPlatform = $state<string | null>(null)
	let addUrl = $state('')

	const bluesky = $derived(syndications.find(s => s.platform === 'bluesky'))
	const mastodon = $derived(syndications.find(s => s.platform === 'mastodon'))
	const isPublished = $derived(contentStatus === 'published')

	$effect(() => {
		if (isPublished && contentId) {
			fetchStatus()
		}
	})

	async function fetchStatus() {
		loading = true
		try {
			const res = await fetch(`/api/syndication/status?contentType=${contentType}&contentId=${contentId}`)
			if (res.ok) {
				const data = await res.json()
				syndications = data.syndications
			}
		} catch {
			// Silently fail
		} finally {
			loading = false
		}
	}

	async function triggerSyndication() {
		triggering = true
		try {
			const res = await fetch('/api/syndication/trigger', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contentType, contentId })
			})
			if (res.ok) {
				const data = await res.json()
				syndications = data.syndications
			}
		} catch {
			// Silently fail
		} finally {
			triggering = false
		}
	}

	function startEdit(record: SyndicationRecord) {
		editingPlatform = record.platform
		editUrl = record.externalUrl || ''
	}

	function cancelEdit() {
		editingPlatform = null
		editUrl = ''
	}

	async function saveEdit(record: SyndicationRecord) {
		try {
			const res = await fetch(`/api/syndication/${record.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ externalUrl: editUrl })
			})
			if (res.ok) {
				const updated = await res.json()
				syndications = syndications.map(s => s.id === updated.id ? updated : s)
			}
		} catch {
			// Silently fail
		} finally {
			editingPlatform = null
			editUrl = ''
		}
	}

	function startAdd(platform: string) {
		addingPlatform = platform
		addUrl = ''
	}

	function cancelAdd() {
		addingPlatform = null
		addUrl = ''
	}

	async function saveAdd(platform: string) {
		if (!addUrl.trim()) return
		try {
			const res = await fetch('/api/syndication/status', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ contentType, contentId, platform, externalUrl: addUrl })
			})
			if (res.ok) {
				const record = await res.json()
				syndications = [...syndications, record]
			}
		} catch {
			// Silently fail
		} finally {
			addingPlatform = null
			addUrl = ''
		}
	}

	function handleEditKeydown(e: KeyboardEvent, record: SyndicationRecord) {
		if (e.key === 'Enter') saveEdit(record)
		if (e.key === 'Escape') cancelEdit()
	}

	function handleAddKeydown(e: KeyboardEvent, platform: string) {
		if (e.key === 'Enter') saveAdd(platform)
		if (e.key === 'Escape') cancelAdd()
	}

	function platformLabel(platform: string): string {
		return platform === 'bluesky' ? 'Bluesky' : 'Mastodon'
	}
</script>

{#if isPublished}
	<div class="syndication-section">
		<h3 class="syndication-title">Syndication</h3>

		{#if loading}
			<p class="syndication-loading">Loading...</p>
		{:else}
			<div class="syndication-grid">
				{#each [{ record: bluesky, platform: 'bluesky' }, { record: mastodon, platform: 'mastodon' }] as { record, platform }}
					<div class="syndication-item">
						<div class="syndication-platform">
							<span class="status-dot" class:success={record?.status === 'success' || record?.status === 'manual'} class:failed={record?.status === 'failed'}></span>
							<span class="platform-label">{platformLabel(platform)}</span>
						</div>
						<div class="syndication-action">
							{#if editingPlatform === platform && record}
								<div class="edit-inline">
									<input
										type="text"
										bind:value={editUrl}
										class="edit-input"
										onkeydown={(e) => handleEditKeydown(e, record)}
										onblur={() => saveEdit(record)}
									/>
								</div>
							{:else if addingPlatform === platform}
								<div class="edit-inline">
									<input
										type="text"
										bind:value={addUrl}
										class="edit-input"
										placeholder="https://..."
										onkeydown={(e) => handleAddKeydown(e, platform)}
										onblur={() => saveAdd(platform)}
									/>
								</div>
							{:else if (record?.status === 'success' || record?.status === 'manual') && record.externalUrl}
								<div class="action-links">
									<a href={record.externalUrl} target="_blank" rel="noopener noreferrer" class="view-link">View</a>
									<button type="button" class="edit-link" onclick={() => startEdit(record)}>Edit</button>
								</div>
							{:else if record?.status === 'failed'}
								<span class="error-text" title={record.errorMessage || ''}>Failed</span>
							{:else}
								<button type="button" class="add-link" onclick={() => startAdd(platform)}>Add link</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			{#if !bluesky || !mastodon || bluesky?.status === 'failed' || mastodon?.status === 'failed'}
				<button
					class="syndicate-button"
					onclick={triggerSyndication}
					disabled={triggering}
				>
					{triggering ? 'Syndicating...' : 'Syndicate Now'}
				</button>
			{/if}
		{/if}
	</div>
{/if}

<style lang="scss">
	.syndication-section {
		padding: $unit-4x;
		background: $gray-97;
		border-radius: $corner-radius;
		border: 1px solid $gray-90;
	}

	.syndication-title {
		margin: 0 0 $unit-2x 0;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.syndication-loading {
		font-size: $font-size-small;
		color: $gray-50;
		margin: 0;
	}

	.syndication-grid {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;
	}

	.syndication-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.syndication-platform {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: $gray-70;

		&.success {
			background: $green-40;
		}

		&.failed {
			background: $red-50;
		}
	}

	.platform-label {
		font-size: $font-size-small;
		color: $gray-30;
		font-weight: 500;
	}

	.syndication-action {
		flex-shrink: 0;
	}

	.action-links {
		display: flex;
		gap: $unit;
	}

	.view-link {
		font-size: $font-size-small;
		color: $blue-50;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
		}
	}

	.edit-link,
	.add-link {
		font-size: $font-size-small;
		color: $gray-50;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;

		&:hover {
			color: $gray-30;
		}
	}

	.edit-inline {
		display: flex;
		align-items: center;
		gap: $unit;
	}

	.edit-input {
		font-size: $font-size-small;
		padding: 2px $unit;
		border: 1px solid $gray-80;
		border-radius: 4px;
		width: 200px;
		color: $gray-20;

		&:focus {
			outline: none;
			border-color: $blue-50;
		}
	}

	.error-text {
		font-size: $font-size-small;
		color: $red-50;
		cursor: help;
	}

	.not-syndicated {
		font-size: $font-size-small;
		color: $gray-50;
	}

	.syndicate-button {
		margin-top: $unit-3x;
		width: 100%;
		padding: $unit $unit-2x;
		font-size: $font-size-small;
		font-weight: 500;
		color: $gray-20;
		background: $white;
		border: 1px solid $gray-80;
		border-radius: $corner-radius;
		cursor: pointer;
		transition: background 0.15s ease;

		&:hover:not(:disabled) {
			background: $gray-97;
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
</style>
