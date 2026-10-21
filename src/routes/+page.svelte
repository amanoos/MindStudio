<script>
  import Mascot from '#lib/components/Mascot.svelte'

  let { data } = $props()

  const accents = ['grape', 'sun', 'coral', 'mint', 'sky']
</script>

<svelte:head><title>Today · Mind Studio</title></svelte:head>

<header class="hello pop-in">
  <Mascot mood={data.status === 'ready' ? 'cheer' : 'sleep'} size={110} />
  <div>
    <p class="date">{data.dateLabel}</p>
    <h1>{data.status === 'ready' ? 'Your five words for today' : 'The word shelf is bare'}</h1>
    {#if data.status === 'ready'}
      <p class="meta">About 10 minutes. Take them one at a time, or all at once.</p>
    {/if}
  </div>
</header>

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
        <h2 class="headword">{w.headword}</h2>
        <p class="pron">
          <span class="visually-hidden">Pronounced </span>{w.pronunciation}
          <span class="pos">{w.pos}</span>
        </p>
        <p class="def">{w.definition}</p>
        <p class="tag">
          <span class="dot" aria-hidden="true"></span>
          {w.confidence === 'sourced' ? 'Sourced history' : 'History uncertain'} · {w.topic}
        </p>
      </li>
    {/each}
  </ol>
{/if}

<style>
  .hello {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-5);
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
  .word:hover {
    transform: translateY(-4px) rotate(-0.4deg);
    box-shadow: var(--shadow-2);
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
</style>
