<script lang="ts">
	import LoadingSpinner from './LoadingSpinner.svelte'

	interface UsageItem {
		contentType: string
		contentId: number
		contentTitle: string
		fieldDisplayName: string
		contentUrl?: string
		createdAt: string
	}

	interface Props {
		usage: UsageItem[]
		loading?: boolean
		emptyMessage?: string
		class?: string
	}

	let {
		usage = [],
		loading = false,
		emptyMessage = 'This media file is not currently used in any content.',
		class: className = ''
	}: Props = $props()
</script>

<div class="media-usage-list {className}">
	{#if loading}
		<div class="usage-loading">
			<LoadingSpinner size="small" />
			<span>Loading usage information...</span>
		</div>
	{:else if usage.length > 0}
		<ul class="usage-list">
			{#each usage as usageItem}
				<li class="usage-item">
					<div class="usage-content">
						<div class="usage-header">
							{#if usageItem.contentUrl}
								<a href={usageItem.contentUrl} class="usage-title" target="_blank" rel="noopener">
									{usageItem.contentTitle}
								</a>
							{:else}
								<span class="usage-title">{usageItem.contentTitle}</span>
							{/if}
							<span class="usage-type">{usageItem.contentType}</span>
						</div>
						<div class="usage-details">
							<span class="usage-field">{usageItem.fieldDisplayName}</span>
							<span class="usage-date"
								>Added {new Date(usageItem.createdAt).toLocaleDateString()}</span
							>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="no-usage">{emptyMessage}</p>
	{/if}
</div>

<style lang="scss">
	.media-usage-list {
		display: flex;
		flex-direction: column;
	}

	.usage-list {
		list-style: none;
		padding: 0;
		margin: $unit-2x 0 0 0;
		display: flex;
		flex-direction: column;
		gap: $unit;
	}

	.usage-loading {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		color: $gray-50;

		span {
			font-size: 0.875rem;
		}
	}

	.usage-item {
		padding: $unit-3x;
		background: $gray-95;
		border-radius: $corner-radius-xl;
		border: $unit-1px solid $gray-90;

		.usage-content {
			display: flex;
			flex-direction: column;
			gap: $unit;
		}

		.usage-header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: $unit-2x;

			.usage-title {
				font-weight: 600;
				color: $gray-10;
				text-decoration: none;
				transition: color 0.2s ease;

				&:hover {
					color: $blue-60;
				}
			}

			.usage-type {
				background: $gray-85;
				color: $gray-30;
				padding: $unit-half $unit;
				border-radius: $corner-radius-sm;
				font-size: 0.75rem;
				font-weight: 500;
				text-transform: uppercase;
				letter-spacing: 0.5px;
				flex-shrink: 0;
			}
		}

		.usage-details {
			display: flex;
			align-items: center;
			gap: $unit-3x;

			.usage-field {
				color: $gray-40;
				font-size: 0.875rem;
				font-weight: 500;
			}

			.usage-date {
				color: $gray-50;
				font-size: 0.75rem;
			}
		}
	}

	.no-usage {
		color: $gray-50;
		font-style: italic;
		margin: $unit-2x 0 0 0;
		font-size: 0.875rem;
	}
</style>
