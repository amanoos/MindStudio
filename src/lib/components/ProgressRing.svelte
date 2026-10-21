<script>
  import { onMount } from 'svelte'

  /** @type {{ done: number, total: number, label?: string }} */
  let { done, total, label = 'words today' } = $props()

  const radius = 42
  const circumference = 2 * Math.PI * radius

  // Start empty and fill on mount so the ring animates in.
  let mounted = $state(false)
  onMount(() => {
    mounted = true
  })
  const shown = $derived(mounted ? done : 0)

  const offset = $derived(
    total > 0 ? circumference * (1 - Math.min(shown / total, 1)) : circumference
  )
</script>

<figure class="ring" aria-label="{done} of {total} {label}">
  <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
    <circle cx="50" cy="50" r={radius} class="track" />
    <circle
      cx="50"
      cy="50"
      r={radius}
      class="fill"
      stroke-dasharray={circumference}
      stroke-dashoffset={offset}
      transform="rotate(-90 50 50)"
    />
  </svg>
  <figcaption><strong>{done}/{total}</strong><span>{label}</span></figcaption>
</figure>

<style>
  .ring {
    position: relative;
    margin: 0;
    width: 104px;
    height: 104px;
    flex: none;
  }
  svg {
    display: block;
  }
  circle {
    fill: none;
    stroke-width: 10;
  }
  .track {
    stroke: var(--line);
  }
  .fill {
    stroke: var(--mint);
    stroke-linecap: round;
    transition: stroke-dashoffset calc(var(--dur-slow) * 2) var(--ease-out);
  }
  figcaption {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    text-align: center;
    line-height: 1.1;
  }
  strong {
    font-family: var(--font-ui);
    font-size: 1.4rem;
  }
  span {
    font-size: 0.7rem;
    color: var(--ink-soft);
  }
</style>
