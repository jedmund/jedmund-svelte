<script lang="ts">
	import type { GardenItem } from '@prisma/client'
	import AdminByline from './AdminByline.svelte'
	import { clickOutside } from '$lib/actions/clickOutside'
	import { getCategoryLabel } from '$lib/constants/garden'
	import { formatRelativeTime } from '$lib/admin/list-formatting'
	let {
		item,
		open,
		onedit,
		ondelete,
		ontoggle,
		onclose
	}: {
		item: GardenItem
		open: boolean
		onedit: (item: GardenItem) => void
		ondelete: (item: GardenItem) => void
		ontoggle: (event: MouseEvent) => void
		onclose: () => void
	} = $props()
	function buildByline(item: GardenItem): string[] {
		const sections: string[] = [getCategoryLabel(item.category)]
		if (item.isCurrent) sections.push('Current')
		if (item.isFavorite) sections.push('Favorite')
		sections.push(formatRelativeTime(item.createdAt as unknown as string))
		return sections
	}
</script>

<div
	class="item-row"
	role="button"
	tabindex="0"
	onclick={() => onedit(item)}
	onkeydown={(e) => e.key === 'Enter' && onedit(item)}
>
	<div class="item-thumbnail">
		{#if item.imageUrl}
			<img src={item.imageUrl} alt={item.title} />
		{:else}
			<div class="placeholder-icon">
				{getCategoryLabel(item.category).charAt(0)}
			</div>
		{/if}
	</div>

	<div class="item-info">
		<h3 class="item-title">{item.title}</h3>
		<AdminByline sections={buildByline(item)} />
	</div>

	<div class="dropdown-container" use:clickOutside={{ enabled: open }} onclickoutside={onclose}>
		<button
			class="action-button"
			type="button"
			onclick={(e) => ontoggle(e)}
			aria-label="Item actions"
		>
			<svg
				width="20"
				height="20"
				viewBox="0 0 20 20"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle cx="10" cy="4" r="1.5" fill="currentColor" />
				<circle cx="10" cy="10" r="1.5" fill="currentColor" />
				<circle cx="10" cy="16" r="1.5" fill="currentColor" />
			</svg>
		</button>

		{#if open}
			<div class="dropdown-menu">
				<button
					class="dropdown-item"
					type="button"
					onclick={(event) => {
						event.stopPropagation()
						onclose()
						onedit(item)
					}}
				>
					Edit
				</button>
				<div class="dropdown-divider"></div>
				<button
					class="dropdown-item danger"
					type="button"
					onclick={(event) => {
						event.stopPropagation()
						onclose()
						ondelete(item)
					}}
				>
					Delete
				</button>
			</div>
		{/if}
	</div>
</div>

<style lang="scss">
	.item-row {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		padding: $unit-2x;
		background: white;
		border-radius: $unit-2x;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover {
			background-color: $gray-95;

			.item-thumbnail {
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			}
		}
	}

	.item-thumbnail {
		flex-shrink: 0;
		width: 60px;
		border-radius: $unit;
		overflow: hidden;
		background-color: $gray-95;
		transition: box-shadow 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;

		img {
			width: 100%;
			height: auto;
			display: block;
		}

		.placeholder-icon {
			width: 60px;
			height: 60px;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: 1.25rem;
			font-weight: 600;
			color: $gray-50;
		}
	}

	.item-info {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: $unit-half;
		min-width: 0;
	}

	.item-title {
		font-size: 1rem;
		font-weight: 600;
		color: $gray-10;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-container {
		position: relative;
		flex-shrink: 0;
	}

	.action-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: $unit;
		cursor: pointer;
		color: $gray-30;
		transition: all 0.2s ease;

		&:hover {
			background-color: rgba(0, 0, 0, 0.05);
		}
	}

	.dropdown-menu {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: $unit-half;
		background: white;
		border: 1px solid $gray-85;
		border-radius: $unit;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		overflow: hidden;
		min-width: 180px;
		z-index: 10;
	}

	.dropdown-item {
		width: 100%;
		padding: $unit-2x $unit-3x;
		background: none;
		border: none;
		text-align: left;
		font-size: 0.875rem;
		color: $gray-20;
		cursor: pointer;
		transition: background-color 0.2s ease;

		&:hover {
			background-color: $gray-95;
		}

		&.danger {
			color: $red-60;
		}
	}

	.dropdown-divider {
		height: 1px;
		background-color: $gray-80;
		margin: $unit-half 0;
	}
</style>
