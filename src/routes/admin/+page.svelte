<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import { goto } from '$app/navigation'

	function goToMediaLibraryTest() {
		goto('/admin/media-library-test')
	}
</script>

<AdminPage title="Dashboard" subtitle="Admin overview and quick actions">
	<div class="dashboard-content">
		<section class="quick-actions">
			<h2>Quick Actions</h2>
			<div class="actions-grid">
				<Button variant="primary" onclick={() => goto('/admin/projects/new')}>
					New Project
				</Button>
				<Button variant="primary" onclick={() => goto('/admin/posts/new')}>
					New Post
				</Button>
				<Button variant="secondary" onclick={() => goto('/admin/media')}>
					Browse Media
				</Button>
				<Button variant="ghost" onclick={goToMediaLibraryTest}>
					Test Media Library
				</Button>
				<Button variant="ghost" onclick={() => goto('/admin/form-components-test')}>
					Test Form Components
				</Button>
			</div>
		</section>
	</div>
</AdminPage>

<style lang="scss">
	.dashboard-content {
		max-width: 800px;
		margin: 0 auto;
		padding: $unit-4x;
	}

	.quick-actions {
		background: white;
		padding: $unit-4x;
		border-radius: $card-corner-radius;
		border: 1px solid $grey-90;

		h2 {
			margin: 0 0 $unit-3x 0;
			font-size: 1.25rem;
			font-weight: 600;
			color: $grey-10;
		}
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: $unit-2x;
	}
</style>