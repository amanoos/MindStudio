<script>
  import { onMount } from 'svelte'

  /** @type {{ summary: string }} */
  let { summary } = $props()

  const steps = $derived(summary.split(/(?<=[.!?])\s+/).filter(Boolean))

  /** @type {HTMLElement | undefined} */
  let el
  // Content is visible without JavaScript; the draw-in effect is only armed once we can observe.
  let armed = $state(false)
  let visible = $state(false)

  onMount(() => {
    if (!el || !('IntersectionObserver' in window)) return
    armed = true
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          visible = true
          io.disconnect()
        }
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  })
</script>

<ol class="timeline" class:armed class:visible bind:this={el} style="--n: {steps.length}">
  {#each steps as step, i (i)}
    <li style="--i: {i}">
      <span class="node" aria-hidden="true"></span>
      <p>{step}</p>
    </li>
  {/each}
</ol>

<style>
  .timeline {
    list-style: none;
    margin: 0;
    padding: 0 0 0 var(--space-5);
    position: relative;
  }
  .timeline::before {
    content: '';
    position: absolute;
    left: 0.55rem;
    top: 0.6rem;
    bottom: 0.6rem;
    width: 4px;
    border-radius: 4px;
    background: linear-gradient(var(--grape), var(--coral), var(--sun));
    transform-origin: top;
  }
  li {
    position: relative;
    padding-bottom: var(--space-4);
  }
  li:last-child {
    padding-bottom: 0;
  }
  .node {
    position: absolute;
    left: calc(-1 * var(--space-5));
    top: 0.35rem;
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    background: var(--sun);
    border: 3px solid var(--ink);
  }
  p {
    margin: 0;
  }

  /* Draw the line, then pop each node in turn. Static when motion is reduced (durations are ~0). */
  .armed::before {
    transform: scaleY(0);
    transition: transform calc(var(--dur-slow) * 2) var(--ease-out);
  }
  .armed.visible::before {
    transform: scaleY(1);
  }
  .armed li {
    opacity: 0;
    transform: translateX(-12px);
    transition:
      opacity var(--dur-med) var(--ease-out),
      transform var(--dur-med) var(--ease-bounce);
    transition-delay: calc(var(--i) * 280ms);
  }
  .armed.visible li {
    opacity: 1;
    transform: none;
  }
  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion='full'])) .armed li {
      transition-delay: 0s;
    }
  }
  :global(:root[data-motion='reduce']) .armed li {
    transition-delay: 0s;
  }
</style>
