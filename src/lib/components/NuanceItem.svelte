<script>
  import { Flag } from 'lucide-svelte'

  /**
   * @type {{
   *   item: import('#lib/ai/nuance-item.js').NuanceItem,
   *   chosen: number,
   *   onchoose: (index: number) => void,
   *   flagged?: boolean,
   *   canFlag?: boolean,
   *   onflag?: () => void
   * }}
   */
  let { item, chosen, onchoose, flagged = false, canFlag = false, onflag } = $props()

  const answered = $derived(chosen >= 0)
  const best = $derived(item.options[item.correctIndex])
  const right = $derived(chosen === item.correctIndex)
  const labels = ['A', 'B', 'C', 'D', 'E', 'F']
</script>

<div class="item">
  <p class="passage">
    {item.before}{#if answered}<mark class="filled">{best.word}</mark>{:else}<span
        class="blank"
        role="img"
        aria-label="blank">&nbsp;</span
      >{/if}{item.after}
  </p>

  <div class="options" role="group" aria-label="Which word fits best?">
    {#each item.options as option, i (i)}
      <button
        type="button"
        class="opt"
        class:right={answered && i === item.correctIndex}
        class:wrong={answered && i === chosen && i !== item.correctIndex}
        disabled={answered}
        onclick={() => onchoose(i)}
      >
        <span class="letter" aria-hidden="true">{labels[i]}</span>
        <span>{option.word}</span>
      </button>
    {/each}
  </div>

  <div class="reveal" class:open={answered} aria-live="polite">
    <div class="inner">
      {#if answered}
        <p class="verdict" class:ok={right}>
          {right ? 'Yes, that is the best fit!' : 'Not quite, and that is how we learn.'}
        </p>
        <p>
          <strong>Best word: {best.word}.</strong>
          {item.reason}
        </p>
        <h3>Each choice</h3>
        <ul class="notes">
          {#each item.options as option, i (i)}
            <li class:best={i === item.correctIndex}>
              <strong>{option.word}</strong>
              {#if i === chosen}<em>(your pick)</em>{/if}: {option.note}
            </li>
          {/each}
        </ul>
        {#if canFlag}
          <button class="link" type="button" onclick={() => onflag?.()} disabled={flagged}>
            <Flag size={16} aria-hidden="true" />
            {flagged ? 'Marked as unclear, thank you' : 'This item seems unclear'}
          </button>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .item {
    display: grid;
    gap: var(--space-3);
  }
  .passage {
    margin: 0;
    font-family: var(--font-word);
    font-size: clamp(1.2rem, 3.5vw, 1.55rem);
    line-height: 1.6;
  }
  .blank {
    display: inline-block;
    min-width: 6ch;
    border-bottom: 4px solid var(--grape-deep);
    margin: 0 0.15em;
  }
  .filled {
    background: color-mix(in srgb, var(--mint) 35%, var(--surface));
    color: var(--ink);
    padding: 0 0.25em;
    border-radius: var(--radius-1);
    animation: pop-in var(--dur-med) var(--ease-bounce) both;
  }
  .options {
    display: grid;
    gap: var(--space-3);
  }
  .opt {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    font: inherit;
    text-align: left;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--line);
    border-radius: var(--radius-2);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    transition:
      transform var(--dur-fast) var(--ease-bounce),
      border-color var(--dur-fast);
  }
  .opt:hover:not(:disabled) {
    transform: translateX(4px);
    border-color: var(--grape);
  }
  .opt:disabled {
    cursor: default;
  }
  .letter {
    flex: none;
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 50%;
    background: var(--surface-2);
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .opt.right {
    border-color: var(--mint);
    background: color-mix(in srgb, var(--mint) 25%, var(--surface));
  }
  .opt.wrong {
    border-color: var(--coral);
    animation: shake 0.4s;
  }
  @keyframes shake {
    25% {
      transform: translateX(-6px);
    }
    75% {
      transform: translateX(6px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion='full'])) .opt.wrong,
    :global(:root:not([data-motion='full'])) .filled {
      animation: none;
    }
  }
  :global(:root[data-motion='reduce']) .opt.wrong,
  :global(:root[data-motion='reduce']) .filled {
    animation: none;
  }
  .reveal {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--dur-slow) var(--ease-out);
  }
  .reveal.open {
    grid-template-rows: 1fr;
  }
  .inner {
    overflow: hidden;
  }
  .reveal.open .inner {
    padding: var(--space-4);
    background: var(--surface-2);
    border-radius: var(--radius-2);
  }
  .verdict {
    margin: 0 0 var(--space-2);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 1.2rem;
  }
  h3 {
    margin: var(--space-3) 0 var(--space-1);
    font-size: 1rem;
  }
  .notes {
    margin: 0 0 var(--space-3);
    padding-left: 1.2rem;
    display: grid;
    gap: var(--space-1);
  }
  .notes .best {
    font-weight: 600;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    background: none;
    border: 0;
    padding: var(--space-1) 0;
    color: var(--link);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .link:disabled {
    cursor: default;
    text-decoration: none;
    color: var(--ink-soft);
  }
</style>
