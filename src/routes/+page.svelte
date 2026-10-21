<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  import { Flame, Repeat2, Brain, Sparkles } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import Spot from '#lib/components/Spot.svelte'
  import ProgressRing from '#lib/components/ProgressRing.svelte'
  import ConfettiBurst from '#lib/components/ConfettiBurst.svelte'

  let { data } = $props()

  const accents = ['grape', 'sun', 'coral', 'mint', 'sky']
  const complete = $derived(data.progress.total > 0 && data.progress.done >= data.progress.total)

  // Celebrate finishing the day once per date, not on every visit.
  let celebrate = $state(false)
  onMount(() => {
    if (!complete) return
    const key = `celebrated-${data.today}`
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, '1')
    } catch {
      /* storage unavailable: celebrate anyway */
    }
    celebrate = true
  })
</script>

<svelte:head><title>Today · Mind Studio</title></svelte:head>

<ConfettiBurst fire={celebrate} />

<header class="hello pop-in">
  <Mascot mood={complete ? 'sleep' : data.status === 'ready' ? 'cheer' : 'sleep'} size={110} />
  <div class="hello-text">
    <p class="date">{data.dateLabel}</p>
    <h1>
      {#if data.status !== 'ready'}The word shelf is bare
      {:else if complete}All five done. Nicely played!
      {:else}Your five words for today{/if}
    </h1>
    {#if data.status === 'ready'}
      <p class="meta">
        {complete
          ? 'Professor Hoot is having a little nap. Come back tomorrow for five fresh words.'
          : 'About 10 minutes. Take them one at a time, or all at once.'}
      </p>
    {/if}
  </div>
  {#if data.status === 'ready'}
    <ProgressRing done={data.progress.done} total={data.progress.total} />
  {/if}
</header>

{#if data.status === 'ready'}
  <nav class="quick" aria-label="Practice">
    <a class="pill" href={resolve('/review')}>
      <Repeat2 size={18} aria-hidden="true" /> Review
      <span class="count">{data.due} due</span>
    </a>
    <a class="pill" href={resolve('/review?scope=today&limit=5')}>
      <Brain size={18} aria-hidden="true" /> Recall check
    </a>
    {#if data.streak > 1}
      <span class="pill streak"
        ><Flame size={18} aria-hidden="true" /> {data.streak} days in a row</span
      >
    {/if}
  </nav>
{/if}

{#if data.status === 'low-reserve'}
  <section class="card pop-in" style="--i: 2">
    <h2>Professor Hoot is out of fresh words</h2>
    <p>
      Only {data.remaining} unused {data.remaining === 1 ? 'word is' : 'words are'} left, and a day needs
      five. Nothing is repeated, so today's set is waiting for new words to be added.
    </p>
  </section>
{:else}
  <ol class="words">
    {#each data.words as w, i (w.slug)}
      <li class="word card pop-in" style="--i: {i + 1}; --accent: var(--{accents[i % 5]})">
        <span class="num" aria-hidden="true">{i + 1}</span>
        <h2 class="headword">
          <a class="stretch" href={resolve('/word/[slug]', { slug: w.slug })}>{w.headword}</a>
        </h2>
        <p class="pron">
          <span class="visually-hidden">Pronounced </span>{w.pronunciation}
          <span class="pos">{w.pos}</span>
        </p>
        <p class="def">{w.definition}</p>
        <span class="spot-wrap"><Spot topic={w.topic} /></span>
        <p class="tag">
          <span class="dot" aria-hidden="true"></span>
          {w.confidence === 'sourced' ? 'Sourced history' : 'History uncertain'} · {w.topic}
        </p>
      </li>
    {/each}
  </ol>
{/if}

{#if data.canCatchUp}
  <section class="card catch pop-in" style="--i: 6">
    <h2>Missed yesterday?</h2>
    <p>No pressure. If you would like, you can pick up yesterday's five words too.</p>
    <form method="POST" action="?/catchUp" use:enhance>
      <button class="btn" type="submit">Catch up on yesterday</button>
    </form>
  </section>
{/if}

{#if data.mindStretch}
  <section class="stretch-card card pop-in" style="--i: 7">
    <Sparkles size={26} aria-hidden="true" />
    <div>
      <p class="kicker">Today's mind-stretcher, if you fancy one</p>
      <h2>{data.mindStretch.title}</h2>
    </div>
    <a
      class="btn"
      href={resolve('/studio/[type]/[slug]', {
        type: data.mindStretch.type,
        slug: data.mindStretch.slug
      })}>Try it</a
    >
  </section>
{/if}

{#if data.catchUpWords.length}
  <section class="catching">
    <h2>Yesterday's words, still waiting</h2>
    <ol class="words small">
      {#each data.catchUpWords as w, i (w.slug)}
        <li class="word card" style="--accent: var(--{accents[(i + 2) % 5]})">
          <h3 class="headword">
            <a class="stretch" href={resolve('/word/[slug]', { slug: w.slug })}>{w.headword}</a>
          </h3>
          <p class="def">{w.definition}</p>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .hello {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-4);
  }
  .hello-text {
    flex: 1;
    min-width: 14rem;
  }
  .date {
    margin: 0;
    font-family: var(--font-hand);
    font-size: 1.6rem;
    color: var(--ink-soft);
  }
  .meta {
    margin: 0;
    color: var(--ink-soft);
  }
  .quick {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin-bottom: var(--space-5);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    font-family: var(--font-ui);
    font-weight: 500;
    text-decoration: none;
  }
  a.pill {
    transition: transform var(--dur-fast) var(--ease-bounce);
  }
  a.pill:hover {
    transform: translateY(-2px);
  }
  .count {
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    font-size: 0.85rem;
  }
  .streak :global(svg) {
    color: var(--coral);
  }
  .words {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
  }
  .word {
    position: relative;
    border-top: 10px solid var(--accent);
    padding-top: var(--space-4);
    transition:
      transform var(--dur-med) var(--ease-bounce),
      box-shadow var(--dur-med);
  }
  .word:hover,
  .word:focus-within {
    transform: translateY(-4px) rotate(-0.4deg);
    box-shadow: var(--shadow-2);
  }
  .spot-wrap {
    position: absolute;
    right: var(--space-4);
    bottom: var(--space-3);
    transition: transform var(--dur-med) var(--ease-bounce);
  }
  .word:hover .spot-wrap {
    transform: rotate(-8deg) scale(1.1);
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
  .num {
    position: absolute;
    top: var(--space-3);
    right: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 2.2rem;
    color: var(--accent);
    opacity: 0.55;
  }
  .headword {
    font-family: var(--font-word);
    font-weight: 600;
    font-size: clamp(1.7rem, 4vw, 2.1rem);
    margin: 0;
    padding-right: 2.5rem;
  }
  .pron {
    margin: var(--space-1) 0 var(--space-3);
    color: var(--ink-soft);
  }
  .pos {
    margin-left: var(--space-2);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    font-size: 0.85rem;
  }
  .def {
    margin: 0 0 var(--space-3);
  }
  .tag {
    margin: 0;
    padding-right: 4rem;
    font-size: 0.9rem;
    color: var(--ink-soft);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--accent);
    flex: none;
  }
  .catch {
    margin-top: var(--space-5);
    max-width: 34rem;
  }
  .stretch-card {
    margin-top: var(--space-5);
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    border-left: 12px solid var(--grape);
  }
  .stretch-card > :global(svg) {
    color: var(--grape);
    flex: none;
  }
  .stretch-card > div {
    flex: 1;
    min-width: 12rem;
  }
  .stretch-card h2,
  .stretch-card .kicker {
    margin: 0;
  }
  .stretch-card .kicker {
    font-family: var(--font-hand);
    font-size: 1.35rem;
    color: var(--ink-soft);
  }
  .catching {
    margin-top: var(--space-5);
  }
  .small .headword {
    font-size: 1.4rem;
  }
</style>
