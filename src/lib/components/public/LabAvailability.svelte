<script lang="ts">
	let { status }: { status: string } = $props()
</script>

{#if status === 'password-protected'}
	<div class="status-indicator password-protected">
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
			<rect
				x="3"
				y="11"
				width="18"
				height="11"
				rx="2"
				ry="2"
				stroke="currentColor"
				stroke-width="2"
			/>
			<circle cx="12" cy="16" r="1" fill="currentColor" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" stroke-width="2" />
		</svg>
		<span>Password Protected</span>
	</div>
{/if}
{#if status === 'list-only'}
	<div class="status-indicator list-only">
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
			<path
				d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
			<path
				d="M1 1l22 22"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
		<span>View Only</span>
	</div>
{/if}

<style lang="scss">
	.status-indicator {
		display: flex;
		align-items: center;
		gap: $unit;
		font-size: 0.875rem;
		padding: $unit $unit-2x;
		border-radius: $unit-2x;
		margin-top: $unit-2x;

		&.list-only {
			background: rgba(239, 68, 68, 0.1);
			color: #dc2626;
		}

		&.password-protected {
			background: rgba(251, 191, 36, 0.1);
			color: #d97706;
		}

		svg {
			width: 14px;
			height: 14px;
			flex-shrink: 0;
		}

		span {
			font-weight: 500;
		}
	}
</style>
