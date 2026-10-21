<script>
  import { resolve } from '$app/paths'
  import { Puzzle, Telescope, Scale, History, Sparkles } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import { STUDIO_TYPES } from '#lib/studio.js'

  let { data } = $props()

  const icons = { teaser: Puzzle, capsule: Telescope, critical: Scale }
  /** @param {string} type */
  const info = (type) => STUDIO_TYPES[/** @type {keyof typeof STUDIO_TYPES} */ (type)]
</script>

<svelte:head><title>Mind Studio · Mind Studio</title></svelte:head>

<header class="hello pop-in">
  <Mascot mood="cheer" size={100} />
  <div>
    <h1>Mind Studio</h1>
    <p>Little workouts for curiosity and clear thinking. No scores, no timers, no pressure.</p>
  </div>
</header>

{#if data.pick}
  <section class="pick card pop-in" style="--i: 1; --c: var(--{info(data.pick.type).color})">
    <Sparkles size={26} aria-hidden="true" />
    <div>
      <p class="kicker">Today's mind-stretcher</p>
      <h2>{data.pick.title}</h2>
      <p class="meta">
        {info(data.pick.type).single}{data.pick.label ? ` · ${data.pick.label}` : ''}
      </p>
    </div>
    <a
      class="btn"
      href={resolve('/studio/[type]/[slug]', { type: data.pick.type, slug: data.pick.slug })}
      >Try it</a
    >
  </section>
{/if}

<ul class="types">
  {#each data.counts as c, i (c.type)}
    {@const Icon = icons[c.type]}
    <li class="type card pop-in" style="--i: {i + 2}; --c: var(--{info(c.type).color})">
      <span class="icon"><Icon size={30} aria-hidden="true" /></span>
      <h2>
        <a class="stretch" href={resolve('/studio/[type]', { type: c.type })}
          >{info(c.type).title}</a
        >
      </h2>
      <p>{info(c.type).blurb}</p>
      <p class="meta">{info(c.type).minutes} · {c.done} of {c.total} tried</p>
      <div class="bar" aria-hidden="true">
        <span style="width: {c.total ? (c.done / c.total) * 100 : 0}%"></span>
      </div>
    </li>
  {/each}
</ul>

<p class="history">
  <History size={18} aria-hidden="true" />
  <a href={resolve('/studio/history')}>See everything you have tried</a>
  {#if data.recent.length}<span class="meta"> · latest: {data.recent[0].title}</span>{/if}
</p>

<style>
  .hello {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-5);
  }
  .hello p {
    margin: 0;
    color: var(--ink-soft);
  }
  .pick {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    border-left: 12px solid var(--c);
    margin-bottom: var(--space-5);
  }
  .pick > :global(svg) {
    color: var(--c);
    flex: none;
  }
  .pick > div {
    flex: 1;
    min-width: 12rem;
  }
  .pick h2,
  .pick p {
    margin: 0;
  }
  .kicker {
    font-family: var(--font-hand);
    font-size: 1.4rem;
    color: var(--ink-soft);
  }
  .meta {
    color: var(--ink-soft);
    font-size: 0.92rem;
  }
  .types {
    list-style: none;
    margin: 0 0 var(--space-5);
    padding: 0;
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  }
  .type {
    position: relative;
    border-top: 10px solid var(--c);
    transition:
      transform var(--dur-med) var(--ease-bounce),
      box-shadow var(--dur-med);
  }
  .type:hover,
  .type:focus-within {
    transform: translateY(-4px) rotate(-0.4deg);
    box-shadow: var(--shadow-2);
  }
  .icon {
    display: inline-grid;
    place-items: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--c) 30%, var(--surface));
    margin-bottom: var(--space-2);
  }
  .type h2 {
    margin: 0 0 var(--space-2);
  }
  .type p {
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
  .bar {
    height: 0.6rem;
    border-radius: var(--radius-pill);
    background: var(--line);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--c);
    border-radius: var(--radius-pill);
  }
  .history {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
</style>
