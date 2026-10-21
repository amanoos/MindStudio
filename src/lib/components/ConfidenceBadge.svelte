<script>
  import { BadgeCheck, CircleHelp } from 'lucide-svelte'

  /** @type {{ confidence: 'sourced' | 'uncertain' }} */
  let { confidence } = $props()
</script>

<span class="badge {confidence}">
  {#if confidence === 'sourced'}
    <BadgeCheck size={18} aria-hidden="true" /> Sourced history
  {:else}
    <CircleHelp size={18} aria-hidden="true" /> History uncertain
  {/if}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    border: 2px solid var(--line);
    background: var(--surface-2);
    font-family: var(--font-ui);
    font-weight: 500;
    font-size: 0.9rem;
  }
  .sourced :global(svg) {
    color: var(--mint);
  }
  .uncertain {
    border-style: dashed;
  }
  .uncertain :global(svg) {
    color: var(--sun);
  }
</style>
