<script lang="ts">
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
</script>

<AdminPage>
	<div class="action-grid">
		<a href="/admin/projects/new" class="action-card">
			<span class="action-icon">➕</span>
			<span>New Project</span>
		</a>
		<a href="/admin/posts/new" class="action-card">
			<span class="action-icon">✏️</span>
			<span>Write Post</span>
		</a>
		<a href="/admin/albums/new" class="action-card">
			<span class="action-icon">📷</span>
			<span>Create Album</span>
		</a>
		<a href="/admin/media" class="action-card">
			<span class="action-icon">⬆️</span>
			<span>Upload Media</span>
		</a>
	</div>
</AdminPage>

<style lang="scss">
	.action-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: $unit-2x;
	}

	.action-card {
		background: $grey-95;
		border-radius: $unit-2x;
		padding: $unit-3x;
		text-align: center;
		text-decoration: none;
		color: $grey-20;
		transition: all 0.2s ease;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: $unit-2x;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.925rem;

		&:hover {
			background-color: $grey-90;
			color: $grey-10;
		}

		.action-icon {
			font-size: 1.5rem;
		}
	}
</style>
