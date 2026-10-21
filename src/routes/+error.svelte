<script>
  import { page } from '$app/state'
  import { resolve } from '$app/paths'
  import Mascot from '#lib/components/Mascot.svelte'

  const notFound = $derived(page.status === 404)
</script>

<svelte:head
  ><title>{notFound ? 'Page not found' : 'Something went wrong'} · Mind Studio</title></svelte:head
>

<section class="oops pop-in">
  <Mascot mood="sleep" size={130} />
  <h1>{notFound ? 'Hoot? Nothing here.' : 'Professor Hoot dropped something.'}</h1>
  <p>
    {#if notFound}
      {page.error?.message && page.error.message !== 'Not Found'
        ? page.error.message
        : 'That page does not exist, or it has not been unlocked yet.'}
    {:else}
      Something went wrong on our side. Nothing you did is lost. Please try again in a moment.
    {/if}
  </p>
  <a class="btn" href={resolve('/')}>Back to Today</a>
</section>

<style>
  .oops {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-3);
    padding-top: var(--space-6);
  }
  p {
    max-width: 30rem;
    margin: 0;
    color: var(--ink-soft);
  }
  .btn {
    text-decoration: none;
  }
</style>
