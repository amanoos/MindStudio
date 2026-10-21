<script>
  /** @type {{ allowed?: string[], onpick?: (rating: string) => void }} */
  let { allowed = ['again', 'hard', 'good', 'easy'], onpick } = $props()

  const all = [
    { value: 'again', label: 'Again', hint: 'Show me soon', color: 'coral' },
    { value: 'hard', label: 'Hard', hint: 'Needed effort', color: 'sun' },
    { value: 'good', label: 'Good', hint: 'Got it', color: 'mint' },
    { value: 'easy', label: 'Easy', hint: 'Effortless', color: 'sky' }
  ]
  const shown = $derived(all.filter((r) => allowed.includes(r.value)))
</script>

<div class="ratings" role="group" aria-label="How well did you know it?">
  {#each shown as r (r.value)}
    <button
      type="submit"
      name="rating"
      value={r.value}
      style="--c: var(--{r.color})"
      onclick={() => onpick?.(r.value)}
    >
      <strong>{r.label}</strong>
      <span>{r.hint}</span>
    </button>
  {/each}
</div>

<style>
  .ratings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: var(--space-3);
  }
  button {
    display: grid;
    gap: 0;
    padding: var(--space-3) var(--space-2);
    border: 2px solid var(--ink);
    border-radius: var(--radius-2);
    background: var(--c);
    color: #2a1f4d;
    font: inherit;
    cursor: pointer;
    box-shadow: 0 4px 0 var(--ink);
    transition:
      transform var(--dur-fast) var(--ease-bounce),
      box-shadow var(--dur-fast);
  }
  button:hover {
    transform: translateY(-3px);
    box-shadow: 0 7px 0 var(--ink);
  }
  button:active {
    transform: translateY(4px) scale(0.97);
    box-shadow: 0 0 0 var(--ink);
  }
  strong {
    font-family: var(--font-ui);
    font-size: 1.15rem;
  }
  span {
    font-size: 0.85rem;
  }
</style>
