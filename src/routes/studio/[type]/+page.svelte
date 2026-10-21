<script>
  import { resolve } from '$app/paths'
  import { ArrowLeft, Check, Shuffle } from 'lucide-svelte'
  import { STUDIO_TYPES } from '#lib/studio.js'

  let { data } = $props()
  const info = $derived(STUDIO_TYPES[data.type])
</script>

<svelte:head><title>{info.title} · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/studio')}><ArrowLeft size={18} aria-hidden="true" /> Mind Studio</a>

<header class="head pop-in" style="--c: var(--{info.color})">
  <div>
    <h1>{info.title}</h1>
    <p>{info.blurb}</p>
  </div>
  {#if data.surprise}
    <a class="btn" href={resolve('/studio/[type]/[slug]', { type: data.type, slug: data.surprise })}
      ><Shuffle size={18} aria-hidden="true" /> Surprise me</a
    >
  {/if}
</header>

<ul class="list" style="--c: var(--{info.color})">
  {#each data.activities as a, i (a.slug)}
    <li class="item card pop-in" style="--i: {Math.min(i, 8)}">
      <h2>
        <a class="stretch" href={resolve('/studio/[type]/[slug]', { type: a.type, slug: a.slug })}
          >{a.title}</a
        >
      </h2>
      <p class="meta">
        {#if a.label}<span class="chip">{a.label}</span>{/if}
        <span class="dots" role="img" aria-label="Difficulty {a.difficulty} of 3">
          {#each [1, 2, 3] as n (n)}<span class="dot" class:on={n <= a.difficulty}></span>{/each}
        </span>
        {#if a.done}<span class="done"
            ><Check size={16} aria-hidden="true" /> Tried{a.attempts > 1
              ? ` ${a.attempts} times`
              : ''}</span
          >{/if}
      </p>
    </li>
  {/each}
</ul>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 500;
  }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-5);
  }
  .head p {
    margin: 0;
    color: var(--ink-soft);
    max-width: 38rem;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  }
  .item {
    position: relative;
    border-top: 8px solid var(--c);
    transition: transform var(--dur-fast) var(--ease-bounce);
  }
  .item:hover,
  .item:focus-within {
    transform: translateY(-3px);
  }
  .item h2 {
    font-size: 1.2rem;
    margin: 0 0 var(--space-2);
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
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .chip {
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    text-transform: capitalize;
  }
  .dots {
    display: inline-flex;
    gap: 3px;
  }
  .dot {
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    border: 2px solid var(--c);
  }
  .dot.on {
    background: var(--c);
  }
  .done {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    color: var(--ink);
    font-weight: 700;
  }
</style>
