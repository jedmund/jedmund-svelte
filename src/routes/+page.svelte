<script lang="ts">
	import ProjectList from '$components/ProjectList.svelte'
	import type { PageData } from './$types'

	let { data } = $props<{ data: PageData }>()
</script>

<ProjectList projects={data?.projects || []} />
