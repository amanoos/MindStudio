<script>
  import Mascot from '#lib/components/Mascot.svelte'

  /** @type {{ title: string }} */
  let { title } = $props()
</script>

<svelte:head><title>{title} · Mind Studio</title></svelte:head>

<section class="soon pop-in">
  <Mascot mood="sleep" size={120} />
  <h1>{title}</h1>
  <p>Professor Hoot is still building this room. Check back soon!</p>
</section>

<style>
  .soon {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-3);
    padding-top: var(--space-6);
  }
</style>
