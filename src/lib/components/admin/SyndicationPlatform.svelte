<script lang="ts">
	import Switch from './Switch.svelte'
	import BlueskyIcon from '$icons/bluesky.svg?component'
	import MastodonIcon from '$icons/mastodon.svg?component'
	import type { SyndicationRecord } from '$lib/admin/syndication/requests'
	let {
		platform,
		record,
		checked,
		onchange,
		isPublished,
		onedit
	}: {
		platform: string
		record?: SyndicationRecord
		checked: boolean
		onchange: (value: boolean) => void
		isPublished: boolean
		onedit: (platform: string, record?: SyndicationRecord) => void
	} = $props()
</script>

<div class="platform-row">
	<div class="toggle-row">
		<span class="toggle-label">
			<span class="platform-icon {platform}">
				{#if platform === 'bluesky'}<BlueskyIcon />{:else}<MastodonIcon />{/if}
			</span>
			{platform === 'bluesky' ? 'Bluesky' : 'Mastodon'}
		</span>
		<div class="platform-controls">
			{#if isPublished && record}
				{#if (record.status === 'success' || record.status === 'manual') && record.externalUrl}
					<div class="action-links">
						<a href={record.externalUrl} target="_blank" rel="noopener noreferrer" class="view-link"
							>View</a
						>
						<button type="button" class="edit-link" onclick={() => onedit(platform, record)}
							>Edit</button
						>
					</div>
				{:else if record.status === 'failed'}
					<span class="error-text" title={record.errorMessage || ''}>Failed</span>
				{/if}
			{:else if isPublished && !record}
				<button type="button" class="add-link" onclick={() => onedit(platform)}>Add link</button>
			{/if}
			<Switch {checked} {onchange} />
		</div>
	</div>
</div>

<style lang="scss">
	.toggle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: $font-size;
		font-weight: 600;
		color: $gray-20;
	}

	.platform-icon {
		display: flex;
		flex-shrink: 0;

		:global(svg) {
			width: 16px;
			height: 16px;
		}

		&.bluesky {
			color: #1185fe;
		}

		&.mastodon {
			color: #6364ff;
		}
	}

	.platform-controls {
		display: flex;
		align-items: center;
		gap: $unit-2x;
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

	.error-text {
		font-size: $font-size-small;
		color: $red-50;
		cursor: help;
	}
</style>
