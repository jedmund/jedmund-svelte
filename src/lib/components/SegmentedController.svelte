<script lang="ts">
	import Pill from './Pill.svelte'
	import WorkIcon from '$icons/work.svg'
	import LabsIcon from '$icons/labs.svg'
	import UniverseIcon from '$icons/universe.svg'
	import { page } from '$app/stores'

	$: currentPath = $page.url.pathname
</script>

<nav class="segmented-controller">
	<Pill icon={WorkIcon} text="Work" href="/" active={currentPath === '/'} variant="work" />
	<Pill icon={LabsIcon} text="Labs" href="#" active={false} variant="default" />
	<Pill icon={UniverseIcon} text="Universe" href="/blog" active={currentPath.startsWith('/blog')} variant="universe" />
</nav>

<style lang="scss">
	.segmented-controller {
		display: flex;
		align-items: center;
		gap: 4px;
		background: $grey-100;
		padding: $unit;
		border-radius: 100px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
</style>
