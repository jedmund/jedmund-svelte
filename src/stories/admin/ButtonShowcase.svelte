<script>
	import Button from '$lib/components/admin/Button.svelte'
</script>

<div class="button-showcase">
	<h3>Button Variants</h3>

	<div class="section">
		<h4>Basic Variants</h4>
		<div class="button-grid">
			<Button variant="primary">Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="danger">Danger</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="text">Text</Button>
			<Button variant="overlay">Overlay</Button>
		</div>
	</div>

	<div class="section">
		<h4>Sizes</h4>
		<div class="button-grid">
			<Button variant="primary" buttonSize="small">Small</Button>
			<Button variant="primary" buttonSize="medium">Medium</Button>
			<Button variant="primary" buttonSize="large">Large</Button>
		</div>
	</div>

	<div class="section">
		<h4>With Icons</h4>
		<div class="button-grid">
			<Button variant="primary" iconPosition="left">
				{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M12 5V19M5 12H19"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
				Add Item
			</Button>

			<Button variant="secondary" iconPosition="right">
				Download
				{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M21 15V19A2 2 0 0119 21H5A2 2 0 013 19V15"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<polyline
						points="7,10 12,15 17,10"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<line
						x1="12"
						y1="15"
						x2="12"
						y2="3"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>{/snippet}
			</Button>

			<Button variant="ghost" iconOnly={true}>
				{#snippet icon()}<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M6 6L18 18M6 18L18 6"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
				</svg>{/snippet}
			</Button>
		</div>
	</div>

	<div class="section">
		<h4>States</h4>
		<div class="button-grid">
			<Button variant="primary" loading={true}>Loading...</Button>
			<Button variant="secondary" disabled={true}>Disabled</Button>
			<Button variant="ghost" active={true}>Active</Button>
		</div>
	</div>

	<div class="section">
		<h4>Square Corners</h4>
		<div class="button-grid">
			<Button variant="primary" pill={false}>Square Primary</Button>
			<Button variant="secondary" pill={false}>Square Secondary</Button>
		</div>
	</div>

	<div class="section">
		<h4>Full Width</h4>
		<Button variant="primary" fullWidth={true}>Full Width Button</Button>
	</div>
</div>

<style lang="scss">
	.button-showcase {
		max-width: 600px;
		padding: 20px;
	}

	h3 {
		margin: 0 0 24px 0;
		font-size: 18px;
		font-weight: 600;
		color: #333;
	}

	.section {
		margin-bottom: 32px;

		h4 {
			margin: 0 0 16px 0;
			font-size: 14px;
			font-weight: 500;
			color: #666;
			text-transform: uppercase;
			letter-spacing: 0.5px;
		}
	}

	.button-grid {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		align-items: center;
	}
</style>
