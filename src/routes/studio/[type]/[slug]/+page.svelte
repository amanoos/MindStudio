<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { ArrowLeft, Lightbulb, ArrowRight } from 'lucide-svelte'
  import ConfettiBurst from '#lib/components/ConfettiBurst.svelte'
  import SourceList from '#lib/components/SourceList.svelte'
  import { STUDIO_TYPES } from '#lib/studio.js'

  let { data } = $props()
  const a = $derived(data.activity)
  const d = $derived(a.data)
  const info = $derived(STUDIO_TYPES[a.type])

  /** @type {{ correct: boolean, answerIndex: number, reveal: string, skill: string | null } | null} */
  let result = $state(null)
  let chosen = $state(-1)
  let showHint = $state(false)
  let reflection = $state('')
  let finished = $state(false)

  // The same page component is reused when moving to another activity, so start fresh each time.
  $effect(() => {
    void a.slug
    result = null
    chosen = -1
    showHint = false
    reflection = ''
    finished = false
  })

  const labels = ['A', 'B', 'C', 'D', 'E']
</script>

<svelte:head><title>{a.title} · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/studio/[type]', { type: a.type })}
  ><ArrowLeft size={18} aria-hidden="true" /> {info.title}</a
>

<article class="play" style="--c: var(--{info.color})">
  <header class="pop-in">
    <p class="kicker">
      {info.single}{#if d.kind || d.area}
        · {d.kind ?? d.area}{/if}
    </p>
    <h1>{a.title}</h1>
  </header>

  {#if a.type === 'capsule'}
    <section class="card story pop-in" style="--i: 1">
      {#each d.body as paragraph, i (i)}
        <p style="--i: {i}">{paragraph}</p>
      {/each}
      <p class="key"><span>The big idea</span>{d.keyIdea}</p>
    </section>

    <section class="card pop-in" style="--i: 2">
      <h2>Something to think about</h2>
      <p class="question">{d.followUp}</p>
      <form
        method="POST"
        action="?/capsule"
        use:enhance={() =>
          async ({ result: r }) => {
            if (r.type === 'success') finished = true
          }}
      >
        <label for="reflection" class="visually-hidden">Your thoughts, optional</label>
        <textarea
          id="reflection"
          name="reflection"
          rows="3"
          maxlength="1000"
          placeholder="Jot a thought if you like. It is just for you, and optional."
          bind:value={reflection}
          disabled={finished}></textarea>
        <div class="row">
          <button class="btn" type="submit" disabled={finished}>I have thought about it</button>
          <span role="status">{finished ? 'Nicely done ✓' : ''}</span>
        </div>
      </form>
    </section>

    <section class="card pop-in" style="--i: 3">
      <h2>Sources</h2>
      <SourceList sources={data.sources} />
    </section>
  {:else}
    <section class="card pop-in" style="--i: 1">
      {#if a.type === 'critical'}
        <p class="scenario">{d.scenario}</p>
        <h2 class="question">{d.question}</h2>
      {:else}
        <h2 class="question">{d.prompt}</h2>
        {#if d.hint}
          {#if showHint}
            <p class="hint" role="note"><Lightbulb size={18} aria-hidden="true" /> {d.hint}</p>
          {:else if !result}
            <button class="link" type="button" onclick={() => (showHint = true)}
              ><Lightbulb size={18} aria-hidden="true" /> Need a hint?</button
            >
          {/if}
        {/if}
      {/if}

      <form
        method="POST"
        action="?/answer"
        use:enhance={({ formData }) => {
          chosen = Number(formData.get('choice'))
          return async ({ result: r }) => {
            const answered = /** @type {any} */ (r).data?.answered
            if (r.type === 'success' && answered) result = answered
          }
        }}
      >
        <div class="options" role="group" aria-label="Choose an answer">
          {#each d.options as option, i (i)}
            <button
              type="submit"
              name="choice"
              value={i}
              class="opt"
              class:right={result && i === result.answerIndex}
              class:wrong={result && i === chosen && i !== result.answerIndex}
              disabled={result !== null}
            >
              <span class="letter" aria-hidden="true">{labels[i]}</span>
              <span>{option}</span>
            </button>
          {/each}
        </div>
      </form>

      <div class="reveal" class:open={result} aria-live="polite">
        <div class="inner">
          {#if result}
            <p class="verdict" class:ok={result.correct}>
              {result.correct ? 'Yes, that is it!' : 'Not quite, and that is how we learn.'}
            </p>
            {#if result.skill}<p class="skill">
                Thinking skill: <strong>{result.skill}</strong>
              </p>{/if}
            <p>{result.reveal}</p>
          {/if}
        </div>
      </div>
    </section>

    {#if a.type === 'critical' && result}
      <section class="card pop-in">
        <h2>Learn more</h2>
        <SourceList sources={data.sources} />
      </section>
    {/if}
  {/if}

  <nav class="after pop-in" aria-label="What next">
    {#if data.next && (result || finished)}
      <a class="btn" href={resolve('/studio/[type]/[slug]', { type: a.type, slug: data.next.slug })}
        >Another one <ArrowRight size={18} aria-hidden="true" /></a
      >
    {/if}
    <a class="link" href={resolve('/studio')}>Back to Mind Studio</a>
  </nav>
</article>

<ConfettiBurst fire={Boolean(result?.correct)} />

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 500;
  }
  .play {
    max-width: 44rem;
    margin: 0 auto;
    display: grid;
    gap: var(--space-4);
  }
  .kicker {
    margin: 0;
    font-family: var(--font-hand);
    font-size: 1.5rem;
    color: var(--ink-soft);
    text-transform: capitalize;
  }
  h1 {
    margin: 0;
  }
  .card {
    border-top: 8px solid var(--c);
  }
  .question {
    font-family: var(--font-word);
    font-size: clamp(1.2rem, 3.5vw, 1.55rem);
    font-weight: 600;
    margin: 0 0 var(--space-3);
  }
  .scenario {
    margin: 0 0 var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-left: 6px solid var(--c);
    background: var(--surface-2);
    border-radius: var(--radius-1);
    font-size: 1.08rem;
  }
  .story p {
    animation: pop-in var(--dur-med) var(--ease-out) both;
    animation-delay: calc(var(--i, 0) * 120ms);
  }
  .key {
    margin: var(--space-4) 0 0;
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--c) 22%, var(--surface));
    border-radius: var(--radius-2);
    font-family: var(--font-hand);
    font-size: 1.5rem;
    line-height: 1.3;
  }
  .key span {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  .hint {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-3);
    background: var(--surface-2);
    border-radius: var(--radius-1);
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
  .options {
    display: grid;
    gap: var(--space-3);
    margin-top: var(--space-3);
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
    border-color: var(--c);
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
    :global(:root:not([data-motion='full'])) .opt.wrong {
      animation: none;
    }
  }
  :global(:root[data-motion='reduce']) .opt.wrong {
    animation: none;
  }

  /* The reasoning unfolds from nothing, using a grid-row transition so no height is needed. */
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
    margin-top: var(--space-4);
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
  .skill {
    margin: 0 0 var(--space-2);
    color: var(--ink-soft);
  }
  .inner p:last-child {
    margin-bottom: 0;
  }
  textarea {
    width: 100%;
    font-family: var(--font-hand);
    font-size: 1.4rem;
    padding: var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
    resize: vertical;
  }
  form {
    display: grid;
    gap: var(--space-2);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .after {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .after .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
  }
</style>
