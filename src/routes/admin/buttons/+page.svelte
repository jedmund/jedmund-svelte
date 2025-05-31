<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
</script>

<AdminPage title="Button Components Demo">
	<div class="button-demo">
		<section>
			<h2>Variants</h2>
			<div class="button-group">
				<Button>Primary</Button>
				<Button variant="secondary">Secondary</Button>
				<Button variant="danger">Danger</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="text">Text</Button>
			</div>
		</section>

		<section>
			<h2>Sizes</h2>
			<div class="button-group">
				<Button size="small">Small</Button>
				<Button size="medium">Medium</Button>
				<Button size="large">Large</Button>
			</div>
		</section>

		<section>
			<h2>Icon Buttons</h2>
			<div class="button-group">
				<Button size="small" iconOnly>
					<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M8 4v8m4-4H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</Button>
				<Button size="medium" iconOnly>
					<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path d="M9 5v8m4-4H5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</Button>
				<Button size="large" iconOnly>
					<svg slot="icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
						<path d="M10 6v8m4-4H6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</Button>
				<Button size="icon" iconOnly variant="ghost">
					<svg slot="icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
						<path d="M6 6l6 6m0-6l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
				</Button>
			</div>
		</section>

		<section>
			<h2>Buttons with Icons</h2>
			<div class="button-group">
				<Button>
					<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M8 4v8m4-4H4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
					</svg>
					Add Item
				</Button>
				<Button iconPosition="right" variant="secondary">
					Next
					<svg slot="icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
						<path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</Button>
			</div>
		</section>

		<section>
			<h2>States</h2>
			<div class="button-group">
				<Button disabled>Disabled</Button>
				<Button loading>Loading</Button>
				<Button active variant="ghost">Active</Button>
			</div>
		</section>

		<section>
			<h2>Square Buttons</h2>
			<div class="button-group">
				<Button pill={false} size="small">Small Square</Button>
				<Button pill={false}>Medium Square</Button>
				<Button pill={false} size="large">Large Square</Button>
			</div>
		</section>

		<section>
			<h2>Full Width</h2>
			<Button fullWidth>Full Width Button</Button>
		</section>
	</div>
</AdminPage>

<style lang="scss">
	.button-demo {
		display: flex;
		flex-direction: column;
		gap: $unit-4x;
		max-width: 800px;
	}

	section {
		display: flex;
		flex-direction: column;
		gap: $unit-2x;

		h2 {
			font-size: 18px;
			font-weight: 600;
			color: $grey-20;
			margin: 0;
		}
	}

	.button-group {
		display: flex;
		align-items: center;
		gap: $unit-2x;
		flex-wrap: wrap;
	}
</style>