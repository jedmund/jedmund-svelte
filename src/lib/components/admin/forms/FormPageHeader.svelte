<script lang="ts">
	import type { Snippet } from 'svelte'
	import AdminSegmentedControl from '../AdminSegmentedControl.svelte'
	let {
		title,
		tabs,
		activeTab = $bindable(),
		actions
	}: {
		title: string
		tabs: Array<{ value: string; label: string }>
		activeTab: string
		actions: Snippet
	} = $props()
</script>

<header>
	<div class="header-left"><h1>{title}</h1></div>
	<div class="header-center">
		<AdminSegmentedControl
			options={tabs}
			value={activeTab}
			onChange={(value) => (activeTab = value)}
		/>
	</div>
	<div class="header-actions">{@render actions()}</div>
</header>

<style lang="scss">
	header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;
	}
	.header-left {
		width: 250px;
		display: flex;
		align-items: center;
		gap: $unit-2x;
	}
	.header-center {
		display: flex;
		justify-content: center;
		align-items: center;
	}
	.header-actions {
		width: 250px;
		display: flex;
		justify-content: flex-end;
		gap: $unit-2x;
	}
	h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: $gray-20;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
