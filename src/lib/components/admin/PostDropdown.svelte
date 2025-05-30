<script lang="ts">
	import { goto } from '$app/navigation'
	
	let isOpen = $state(false)
	let buttonRef: HTMLButtonElement
	
	const postTypes = [
		{ value: 'blog', label: '📝 Blog Post', description: 'Long-form article' },
		{ value: 'microblog', label: '💭 Microblog', description: 'Short thought' },
		{ value: 'link', label: '🔗 Link', description: 'Share a link' },
		{ value: 'photo', label: '📷 Photo', description: 'Single photo post' },
		{ value: 'album', label: '🖼️ Album', description: 'Photo collection' }
	]
	
	function handleSelection(type: string) {
		isOpen = false
		goto(`/admin/posts/new?type=${type}`)
	}
	
	function handleClickOutside(event: MouseEvent) {
		if (!buttonRef?.contains(event.target as Node)) {
			isOpen = false
		}
	}
	
	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	})
</script>

<div class="dropdown-container">
	<button 
		bind:this={buttonRef}
		class="btn btn-primary"
		onclick={(e) => { e.stopPropagation(); isOpen = !isOpen }}
	>
		New Post
		<svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="chevron">
			<path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
		</svg>
	</button>
	
	{#if isOpen}
		<div class="dropdown-menu">
			{#each postTypes as type}
				<button 
					class="dropdown-item"
					onclick={() => handleSelection(type.value)}
				>
					<span class="dropdown-icon">{type.label}</span>
					<div class="dropdown-text">
						<span class="dropdown-label">{type.label.split(' ')[1]}</span>
						<span class="dropdown-description">{type.description}</span>
					</div>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style lang="scss">
	@import '$styles/variables.scss';
	
	.dropdown-container {
		position: relative;
	}
	
	.btn {
		padding: $unit-2x $unit-3x;
		border: none;
		border-radius: 50px;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		font-size: 0.925rem;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		gap: $unit;
		
		&.btn-primary {
			background-color: $grey-10;
			color: white;
			
			&:hover {
				background-color: $grey-20;
			}
		}
	}
	
	.chevron {
		transition: transform 0.2s ease;
	}
	
	.dropdown-menu {
		position: absolute;
		top: calc(100% + $unit);
		right: 0;
		background: white;
		border: 1px solid $grey-80;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		min-width: 200px;
		z-index: 100;
		overflow: hidden;
	}
	
	.dropdown-item {
		width: 100%;
		padding: $unit-2x;
		border: none;
		background: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: $unit-2x;
		text-align: left;
		transition: background 0.2s ease;
		font-family: 'cstd', 'Helvetica Neue', Arial, sans-serif;
		
		&:hover {
			background: $grey-95;
		}
		
		&:not(:last-child) {
			border-bottom: 1px solid $grey-90;
		}
	}
	
	.dropdown-icon {
		font-size: 1.25rem;
		flex-shrink: 0;
	}
	
	.dropdown-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	
	.dropdown-label {
		font-size: 0.925rem;
		font-weight: 600;
		color: $grey-10;
	}
	
	.dropdown-description {
		font-size: 0.75rem;
		color: $grey-40;
	}
</style>