<script lang="ts">
	import { onMount, onDestroy } from 'svelte'
	import AdminPage from '$lib/components/admin/AdminPage.svelte'
	import AdminSegmentedControl from '$lib/components/admin/AdminSegmentedControl.svelte'
	import LoadingSpinner from '$lib/components/admin/LoadingSpinner.svelte'
	import Button from '$lib/components/admin/Button.svelte'
	import SettingsSection from '$lib/components/admin/SettingsSection.svelte'
	import { SETTINGS_PANELS } from '$lib/admin/settings/fields'
	import { createSettingsSession } from '$lib/admin/settings/session.svelte'
	const session = createSettingsSession()
	let activeTab = $state('general')
	const tabOptions = [
		{ value: 'general', label: 'General' },
		{ value: 'seo', label: 'SEO' },
		{ value: 'integrations', label: 'Integrations' },
		{ value: 'syndication', label: 'Syndication' }
	]
	onMount(() => {
		void session.load()
	})
	onDestroy(() => session.dispose())
</script>

<svelte:head><title>Settings - Admin @jedmund</title></svelte:head>
<AdminPage>
	{#snippet header()}
		<header class="settings-header">
			<div class="header-left">
				<h1>Settings</h1>
			</div>
			<div class="header-center">
				<AdminSegmentedControl
					options={tabOptions}
					value={activeTab}
					onChange={(value) => (activeTab = value)}
				/>
			</div>
			<div class="header-right">
				<Button variant="primary" onclick={session.save} loading={session.state.saving}
					>Save settings</Button
				>
			</div>
		</header>
	{/snippet}

	<div class="settings-container">
		{#if session.state.loading}
			<div class="loading-container"><LoadingSpinner /></div>
		{:else}
			<div class="tab-panels">
				{#each SETTINGS_PANELS as panel (panel.tab)}
					<div class="panel" class:active={activeTab === panel.tab}>
						{#each panel.sections as section}
							<SettingsSection
								{section}
								bind:values={session.state.formValues}
								meta={session.state.meta}
								result={section.service ? session.state.testResults[section.service] : undefined}
								ontest={session.testConnection}
							/>
						{/each}
					</div>
				{/each}
			</div>
		{/if}
	</div>
</AdminPage>

<style lang="scss">
	.settings-header {
		display: grid;
		grid-template-columns: 250px 1fr 250px;
		align-items: center;
		width: 100%;
		gap: $unit-2x;

		h1 {
			margin: 0;
			font-size: $font-size-large;
			font-weight: 700;
			color: $gray-10;
		}
	}

	.header-left {
		display: flex;
		align-items: center;
	}

	.header-center {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.header-right {
		display: flex;
		justify-content: flex-end;
		align-items: center;
	}

	.settings-container {
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
		padding: 0 $unit-2x $unit-4x;
	}

	.loading-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 400px;
	}

	.tab-panels {
		.panel {
			display: none;

			&.active {
				display: block;
			}
		}
	}
</style>
