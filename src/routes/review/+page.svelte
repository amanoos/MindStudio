<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { fly } from 'svelte/transition'
  import Mascot from '#lib/components/Mascot.svelte'
  import RatingButtons from '#lib/components/RatingButtons.svelte'
  import ConfettiBurst from '#lib/components/ConfettiBurst.svelte'

  let { data } = $props()

  let index = $state(0)
  /** @type {'ask' | 'feedback'} */
  let phase = $state('ask')
  /** @type {boolean | null} null = self-rated flashcard */
  let correct = $state(null)
  let chosen = $state(-1)
  let typed = $state('')
  let lastRating = ''
  /** @type {string[]} */
  let ratings = $state([])

  const total = $derived(data.questions.length)
  const q = $derived(data.questions[index])
  const finished = $derived(total > 0 && index >= total)
  const perfect = $derived(finished && total >= 3 && !ratings.includes('again'))

  /** @param {number} i */
  function choose(i) {
    if (phase !== 'ask' || !q || (q.type !== 'choice' && q.type !== 'synonym')) return
    chosen = i
    correct = i === q.answerIndex
    phase = 'feedback'
  }

  function checkTyped() {
    if (phase !== 'ask' || !q || q.type !== 'fill') return
    correct = q.accept.includes(typed.trim().toLowerCase())
    phase = 'feedback'
  }

  function reveal() {
    correct = null
    phase = 'feedback'
  }

  function advance() {
    ratings = [...ratings, lastRating]
    index += 1
    phase = 'ask'
    correct = null
    chosen = -1
    typed = ''
  }

  const allowed = $derived(correct === false ? ['again'] : ['again', 'hard', 'good', 'easy'])
  const counts = $derived(
    ['again', 'hard', 'good', 'easy'].map((r) => ({ r, n: ratings.filter((x) => x === r).length }))
  )
  const title = $derived(data.scope === 'today' ? 'Recall check' : 'Review')
</script>

<svelte:head><title>{title} · Mind Studio</title></svelte:head>

{#if total === 0}
  <section class="empty pop-in">
    <Mascot mood="sleep" size={130} />
    <h1>Nothing due right now</h1>
    <p>
      Everything is scheduled for later. Open a word from Today to revisit it, or stretch your mind
      in the Studio.
    </p>
    <a class="btn" href={resolve('/')}>Back to Today</a>
  </section>
{:else if finished}
  <section class="empty pop-in">
    <ConfettiBurst fire={perfect} />
    <Mascot mood="cheer" size={130} />
    <h1>{perfect ? 'Beautifully done!' : 'Session complete'}</h1>
    <p>
      You reviewed {total}
      {total === 1 ? 'word' : 'words'}. Words you found hard will come back sooner.
    </p>
    <ul class="summary">
      {#each counts as c (c.r)}<li><strong>{c.n}</strong> {c.r}</li>{/each}
    </ul>
    <a class="btn" href={resolve('/')}>Back to Today</a>
  </section>
{:else}
  <header class="head">
    <h1>{title}</h1>
    <p class="count" aria-live="polite">Question {index + 1} of {total}</p>
    <div
      class="bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax={total}
      aria-valuenow={index}
      aria-label="Session progress"
    >
      <span style="width: {(index / total) * 100}%"></span>
    </div>
  </header>

  {#key index}
    <section class="card q" in:fly={{ x: 40, duration: 300 }}>
      {#if q.type === 'flashcard'}
        <p class="kicker">What does this word mean?</p>
        <h2 class="word">{q.headword}</h2>
        {#if phase === 'ask'}
          <button class="btn" type="button" onclick={reveal}>Show the meaning</button>
        {/if}
      {:else if q.type === 'choice' || q.type === 'synonym'}
        <p class="kicker">{q.type === 'choice' ? 'Pick the word' : 'Pick the shade of meaning'}</p>
        <h2 class="prompt">{q.prompt}</h2>
        <div class="options" role="group" aria-label="Answers">
          {#each q.options as option, i (i)}
            <button
              type="button"
              class="opt"
              class:right={phase === 'feedback' && i === q.answerIndex}
              class:wrong={phase === 'feedback' && i === chosen && i !== q.answerIndex}
              disabled={phase === 'feedback'}
              onclick={() => choose(i)}
            >
              {option}
            </button>
          {/each}
        </div>
      {:else if q.type === 'fill'}
        <p class="kicker">Fill in the blank</p>
        <h2 class="prompt">{q.sentence}</h2>
        <form
          class="fill"
          onsubmit={(e) => {
            e.preventDefault()
            checkTyped()
          }}
        >
          <label class="visually-hidden" for="answer">Your answer</label>
          <input
            id="answer"
            bind:value={typed}
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            disabled={phase === 'feedback'}
            placeholder={q.hint}
          />
          {#if phase === 'ask'}<button class="btn" type="submit">Check</button>{/if}
        </form>
      {/if}

      {#if phase === 'feedback'}
        <div class="feedback" role="status" in:fly={{ y: 16, duration: 250 }}>
          {#if correct === true}
            <p class="verdict ok">That's it!</p>
          {:else if correct === false}
            <p class="verdict no">Not quite, and that's how words stick.</p>
          {/if}
          <p><strong>{q.headword}:</strong> {q.explain.definition}</p>
          {#if q.explain.example}<p class="ex"><q>{q.explain.example}</q></p>{/if}
          {#if correct === false}
            <p class="tip">Mark it Again and it will come back soon.</p>
          {/if}
        </div>

        <form
          method="POST"
          action="?/rate"
          use:enhance={() =>
            async ({ result }) => {
              if (result.type === 'success') advance()
            }}
        >
          <input type="hidden" name="wordId" value={q.wordId} />
          <input type="hidden" name="type" value={q.type} />
          <input type="hidden" name="correct" value={correct === null ? '' : String(correct)} />
          <RatingButtons {allowed} onpick={(r) => (lastRating = r)} />
        </form>
      {/if}
    </section>
  {/key}

  <details class="filters">
    <summary>Filter this session</summary>
    <form method="GET" action={resolve('/review')}>
      <label
        >Topic
        <select name="topic">
          <option value="">Any</option>
          {#each data.topics as t (t)}<option value={t} selected={t === data.filters.topic}
              >{t}</option
            >{/each}
        </select>
      </label>
      <label
        >Part of speech
        <select name="pos">
          <option value="">Any</option>
          {#each ['noun', 'verb', 'adjective', 'adverb'] as p (p)}<option
              value={p}
              selected={p === data.filters.pos}>{p}</option
            >{/each}
        </select>
      </label>
      <label class="check">
        <input type="checkbox" name="favorites" value="1" checked={data.filters.favorites} />
        Favorites only
      </label>
      <button class="btn" type="submit">Apply</button>
    </form>
  </details>
{/if}

<style>
  .head {
    max-width: 40rem;
    margin: 0 auto var(--space-4);
  }
  .count {
    margin: 0 0 var(--space-2);
    color: var(--ink-soft);
  }
  .bar {
    height: 0.7rem;
    border-radius: var(--radius-pill);
    background: var(--line);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--mint);
    border-radius: var(--radius-pill);
    transition: width var(--dur-med) var(--ease-out);
  }
  .q {
    max-width: 40rem;
    margin: 0 auto;
    display: grid;
    gap: var(--space-4);
  }
  .kicker {
    margin: 0;
    font-family: var(--font-hand);
    font-size: 1.5rem;
    color: var(--ink-soft);
  }
  .word {
    font-family: var(--font-word);
    font-size: clamp(2.2rem, 7vw, 3.4rem);
    margin: 0;
  }
  .prompt {
    font-family: var(--font-word);
    font-size: clamp(1.2rem, 3.5vw, 1.6rem);
    font-weight: 600;
    margin: 0;
  }
  .options {
    display: grid;
    gap: var(--space-3);
  }
  .opt {
    font: inherit;
    font-family: var(--font-word);
    font-size: 1.15rem;
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
    :global(:root:not([data-motion='full'])) .opt.wrong {
      animation: none;
    }
  }
  :global(:root[data-motion='reduce']) .opt.wrong {
    animation: none;
  }
  .fill {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
  .fill input {
    flex: 1;
    min-width: 12rem;
    font: inherit;
    font-size: 1.2rem;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  .feedback {
    padding: var(--space-4);
    border-radius: var(--radius-2);
    background: var(--surface-2);
  }
  .feedback p {
    margin: 0 0 var(--space-2);
  }
  .verdict {
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 1.2rem;
  }
  .ex q {
    font-family: var(--font-word);
  }
  .tip {
    color: var(--ink-soft);
  }
  .empty {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-3);
    padding-top: var(--space-6);
  }
  .summary {
    list-style: none;
    display: flex;
    gap: var(--space-4);
    margin: 0;
    padding: 0;
  }
  .filters {
    max-width: 40rem;
    margin: var(--space-5) auto 0;
  }
  .filters form {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: end;
    margin-top: var(--space-3);
  }
  .filters label {
    display: grid;
    gap: var(--space-1);
    font-weight: 700;
  }
  .filters .check {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .filters select {
    font: inherit;
    padding: var(--space-2);
    border-radius: var(--radius-1);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
  }
</style>
