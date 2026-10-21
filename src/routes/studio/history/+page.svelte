<script>
  import { resolve } from '$app/paths'
  import { ArrowLeft } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import { STUDIO_TYPES } from '#lib/studio.js'

  let { data } = $props()

  const outcome = {
    correct: 'Got it',
    incorrect: 'Learned something',
    completed: 'Read and reflected'
  }
  /** @param {string} r */
  const label = (r) => outcome[/** @type {keyof typeof outcome} */ (r)] ?? r
  /** @param {string} t */
  const info = (t) => STUDIO_TYPES[/** @type {keyof typeof STUDIO_TYPES} */ (t)]
</script>

<svelte:head><title>What you have tried · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/studio')}><ArrowLeft size={18} aria-hidden="true" /> Mind Studio</a>

<h1 class="pop-in">What you have tried</h1>

{#if data.entries.length === 0}
  <section class="empty pop-in">
    <Mascot mood="sleep" size={110} />
    <p>Nothing here yet. Your attempts will appear as you try the activities.</p>
    <a class="btn" href={resolve('/studio')}>Pick something</a>
  </section>
{:else}
  <ul class="entries">
    {#each data.entries as e, i (e.id)}
      <li class="entry card pop-in" style="--i: {Math.min(i, 8)}; --c: var(--{info(e.type).color})">
        <div>
          <h2>
            <a
              class="stretch"
              href={resolve('/studio/[type]/[slug]', { type: e.type, slug: e.slug })}>{e.title}</a
            >
          </h2>
          <p class="meta">{info(e.type).single} · {e.when}</p>
          {#if e.reflection}<p class="reflection">“{e.reflection}”</p>{/if}
        </div>
        <span class="result" class:ok={e.result === 'correct'}>{label(e.result)}</span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 500;
  }
  .entries {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
    max-width: 46rem;
  }
  .entry {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: flex-start;
    border-left: 10px solid var(--c);
    padding: var(--space-3) var(--space-4);
  }
  .entry h2 {
    font-size: 1.15rem;
    margin: 0;
  }
  .stretch {
    color: inherit;
    text-decoration: none;
  }
  .stretch::after {
    content: '';
    position: absolute;
    inset: 0;
  }
  .meta {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .reflection {
    margin: var(--space-2) 0 0;
    font-family: var(--font-hand);
    font-size: 1.3rem;
    line-height: 1.25;
  }
  .result {
    flex: none;
    padding: 0 var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    font-family: var(--font-ui);
    font-size: 0.9rem;
    white-space: nowrap;
  }
  .result.ok {
    border-color: var(--mint);
  }
  .empty {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-3);
    padding-top: var(--space-5);
  }
</style>
