<script lang="ts">
	interface Column<T> {
		key: string
		label: string
		render?: (item: T) => string
		component?: any
		width?: string
	}

	interface Props<T> {
		data: T[]
		columns: Column<T>[]
		isLoading?: boolean
		emptyMessage?: string
		onRowClick?: (item: T) => void
		unstyled?: boolean
	}

	let {
		data = [],
		columns = [],
		isLoading = false,
		emptyMessage = 'No data found',
		onRowClick,
		unstyled = false
	}: Props<any> = $props()

	function getCellValue(item: any, column: Column<any>) {
		if (column.render) {
			return column.render(item)
		}

		// Handle nested properties
		const keys = column.key.split('.')
		let value = item
		for (const key of keys) {
			value = value?.[key]
		}

		return value
	}
</script>

<div class="data-table-wrapper" class:unstyled>
	{#if isLoading}
		<div class="loading">
			<div class="spinner"></div>
			<p>Loading...</p>
		</div>
	{:else if data.length === 0}
		<div class="empty-state">
			<p>{emptyMessage}</p>
		</div>
	{:else}
		<table class="data-table">
			<thead>
				<tr>
					{#each columns as column}
						<th style={column.width ? `width: ${column.width}` : ''}>
							{column.label}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data as item}
					<tr class:clickable={!!onRowClick} onclick={() => onRowClick?.(item)}>
						{#each columns as column}
							<td>
								{#if column.component}
									<svelte:component this={column.component} {item} />
								{:else}
									{getCellValue(item, column)}
								{/if}
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style lang="scss">
	.data-table-wrapper {
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

		&.unstyled {
			border-radius: 0;
			box-shadow: none;
		}
	}

	.loading {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		.spinner {
			width: 32px;
			height: 32px;
			border: 3px solid $grey-80;
			border-top-color: $primary-color;
			border-radius: 50%;
			margin: 0 auto $unit-2x;
			animation: spin 0.8s linear infinite;
		}
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.empty-state {
		padding: $unit-8x;
		text-align: center;
		color: $grey-40;

		p {
			margin: 0;
		}
	}

	.data-table {
		width: 100%;
		border-collapse: collapse;

		thead {
			background-color: $grey-95;
			border-bottom: 1px solid $grey-85;
		}

		th {
			padding: $unit-3x $unit-4x;
			text-align: left;
			font-weight: 600;
			font-size: 0.875rem;
			color: $grey-30;
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		tbody tr {
			border-bottom: 1px solid $grey-90;
			transition: background-color 0.2s ease;

			&:hover {
				background-color: $grey-97;
			}

			&.clickable {
				cursor: pointer;
			}

			&:last-child {
				border-bottom: none;
			}
		}

		td {
			padding: $unit-4x;
			color: $grey-20;
		}
	}
</style>
