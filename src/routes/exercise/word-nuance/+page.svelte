<script>
  import { onMount, tick } from 'svelte'
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { ArrowLeft, Wand2, History } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import NuanceItem from '#lib/components/NuanceItem.svelte'
  import ConfettiBurst from '#lib/components/ConfettiBurst.svelte'
  import { readKey } from '#lib/ai/key-store.js'
  import { getModel, getSecondOpinion, setSecondOpinion } from '#lib/ai/settings.js'
  import { generateNuanceItem } from '#lib/ai/generate.js'
  import { pickOptions, checkTypedWord } from '#lib/ai/word-input.js'

  let { data } = $props()

  let hasKey = $state(false)
  let doubleCheck = $state(false)
  onMount(() => {
    hasKey = readKey() !== null
    doubleCheck = getSecondOpinion()
  })

  let tab = $state(/** @type {'mine' | 'typed'} */ ('mine'))
  let query = $state('')
  let picked = $state(/** @type {string | null} */ (null))
  let typed = $state('')
  let length = $state('sentence')
  let choices = $state('4')
  let difficulty = $state('medium')

  /** @type {'setup' | 'loading' | 'play'} */
  let phase = $state('setup')
  let problem = $state('')
  /** @type {import('#lib/ai/nuance-item.js').NuanceItem | null} */
  let item = $state(null)
  let word = $state('')
  let model = $state('')
  let chosen = $state(-1)
  let savedId = $state(/** @type {number | null} */ (null))
  let flagged = $state(false)

  /** @type {HTMLFormElement | undefined} */
  let saveForm = $state()
  /** @type {HTMLFormElement | undefined} */
  let flagForm = $state()

  const shown = $derived(
    data.words.filter((w) => w.headword.toLowerCase().includes(query.trim().toLowerCase()))
  )
  const chosenWord = $derived(data.words.find((w) => w.headword === picked))

  /** @param {string} [again] a word to reuse for "another one" */
  async function generate(again) {
    problem = ''
    /** @type {string} */
    let target
    /** @type {string[]} */
    let options = []
    if (again) {
      target = again
      const known = data.words.find((w) => w.headword === again)
      if (known) options = pickOptions(known.related, Number(choices))
    } else if (tab === 'mine') {
      if (!chosenWord) {
        problem = 'Pick a word from your list first.'
        return
      }
      target = chosenWord.headword
      options = pickOptions(chosenWord.related, Number(choices))
    } else {
      const checked = checkTypedWord(typed)
      if (!checked.ok) {
        problem = checked.error
        return
      }
      target = checked.word
    }

    phase = 'loading'
    model = getModel()
    const result = await generateNuanceItem(
      { word: target, options, length, difficulty, choices: Number(choices) },
      { model, secondOpinion: doubleCheck }
    )
    if (!result.ok) {
      problem = result.problem
      phase = 'setup'
      return
    }
    word = target
    item = result.item
    chosen = -1
    savedId = null
    flagged = false
    phase = 'play'
  }

  /** @param {number} index */
  async function choose(index) {
    chosen = index
    await tick()
    saveForm?.requestSubmit()
  }

  async function flag() {
    if (savedId === null) return
    await tick()
    flagForm?.requestSubmit()
  }

  function backToSetup() {
    phase = 'setup'
    item = null
    chosen = -1
  }

  /** @param {string} s */
  const when = (s) => s.slice(0, 16).replace('T', ' ')
</script>

<svelte:head><title>Word Nuance · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/exercise')}><ArrowLeft size={18} aria-hidden="true" /> Exercise</a>

<article class="play">
  <header class="pop-in head">
    <Mascot
      mood={phase === 'play' && chosen >= 0 && item?.correctIndex === chosen ? 'cheer' : 'happy'}
      size={72}
      label=""
    />
    <div>
      <p class="kicker">Exercise</p>
      <h1>Word Nuance</h1>
    </div>
  </header>

  {#if phase === 'loading'}
    <section class="card loading" role="status" aria-live="polite">
      <Mascot mood="happy" size={90} label="" />
      <p>Professor Hoot is writing a tricky one for you…</p>
    </section>
  {:else if phase === 'play' && item}
    <section class="card pop-in">
      <p class="kicker">Which word fits best? <span class="target">Word: {word}</span></p>
      <NuanceItem
        {item}
        {chosen}
        onchoose={choose}
        {flagged}
        canFlag={savedId !== null}
        onflag={flag}
      />
    </section>
    {#if chosen >= 0}
      <nav class="after" aria-label="What next">
        <button class="btn" type="button" onclick={() => generate(word)}
          >Another one with this word</button
        >
        <button class="link" type="button" onclick={backToSetup}>Choose a different word</button>
      </nav>
    {/if}

    <!-- Saves the attempt. Sends the finished item, never anything about the key. -->
    <form
      bind:this={saveForm}
      method="POST"
      action="?/save"
      class="hidden"
      use:enhance={() =>
        async ({ result, update }) => {
          if (result.type === 'success') {
            savedId = /** @type {any} */ (result.data)?.saved?.id ?? null
          }
          await update({ reset: false })
        }}
    >
      <input type="hidden" name="word" value={word} />
      <input type="hidden" name="item" value={JSON.stringify(item)} />
      <input type="hidden" name="chosen" value={chosen} />
      <input type="hidden" name="model" value={model} />
    </form>
    <form
      bind:this={flagForm}
      method="POST"
      action="?/flag"
      class="hidden"
      use:enhance={() =>
        async ({ result, update }) => {
          if (result.type === 'success') flagged = true
          await update({ reset: false })
        }}
    >
      <input type="hidden" name="id" value={savedId ?? ''} />
      <input type="hidden" name="flagged" value="1" />
    </form>
  {:else}
    <section class="card pop-in setup">
      {#if !hasKey}
        <p class="notice" role="note">
          Word Nuance needs your Claude key.
          <a href={resolve('/exercise')}>Add it on the Exercise page</a>.
        </p>
      {/if}

      <div class="tabs" role="tablist" aria-label="Where the word comes from">
        <button
          type="button"
          role="tab"
          id="tab-mine"
          aria-selected={tab === 'mine'}
          aria-controls="panel-mine"
          class:on={tab === 'mine'}
          onclick={() => (tab = 'mine')}>My words</button
        >
        <button
          type="button"
          role="tab"
          id="tab-typed"
          aria-selected={tab === 'typed'}
          aria-controls="panel-typed"
          class:on={tab === 'typed'}
          onclick={() => (tab = 'typed')}>Type a word</button
        >
      </div>

      {#if tab === 'mine'}
        <div role="tabpanel" id="panel-mine" aria-labelledby="tab-mine" class="panel">
          {#if data.words.length === 0}
            <p>
              You have not met any words yet. Open <a href={resolve('/')}>Today</a> first, or type a word.
            </p>
          {:else}
            <label for="find">Find one of your words</label>
            <input id="find" type="search" bind:value={query} placeholder="Start typing…" />
            <ul class="wordlist" aria-label="Your words">
              {#each shown as w (w.slug)}
                <li>
                  <button
                    type="button"
                    class="pick"
                    class:on={picked === w.headword}
                    aria-pressed={picked === w.headword}
                    onclick={() => (picked = w.headword)}>{w.headword}</button
                  >
                </li>
              {:else}
                <li class="none">No match.</li>
              {/each}
            </ul>
          {/if}
        </div>
      {:else}
        <div role="tabpanel" id="panel-typed" aria-labelledby="tab-typed" class="panel">
          <label for="typed">Any word you like</label>
          <input id="typed" type="text" bind:value={typed} autocomplete="off" maxlength="40" />
          <p class="meta">Claude will pick the near-synonyms for a word you type.</p>
        </div>
      {/if}

      <fieldset>
        <legend>Length</legend>
        <label><input type="radio" bind:group={length} value="sentence" /> One sentence</label>
        <label><input type="radio" bind:group={length} value="paragraph" /> A short paragraph</label
        >
      </fieldset>
      <fieldset>
        <legend>Difficulty</legend>
        <label><input type="radio" bind:group={difficulty} value="gentle" /> Gentle</label>
        <label><input type="radio" bind:group={difficulty} value="medium" /> Medium</label>
        <label><input type="radio" bind:group={difficulty} value="tricky" /> Tricky</label>
      </fieldset>
      <div class="field">
        <label for="choices">Number of choices</label>
        <select id="choices" bind:value={choices}>
          <option value="4">4</option>
          <option value="5">5</option>
          <option value="6">6</option>
        </select>
      </div>

      <label class="check">
        <input
          type="checkbox"
          bind:checked={doubleCheck}
          onchange={() => setSecondOpinion(doubleCheck)}
        />
        Double-check each one with a second request (slower, costs a little more)
      </label>

      <p class="problem" role="alert">{problem}</p>
      <div class="row">
        <button class="btn" type="button" onclick={() => generate()} disabled={!hasKey}>
          <Wand2 size={18} aria-hidden="true" /> Write one for me
        </button>
      </div>
    </section>

    <section class="card history" aria-labelledby="history-h">
      <h2 id="history-h"><History size={20} aria-hidden="true" /> Recent tries</h2>
      {#if data.attempts.length === 0}
        <p class="meta">Nothing yet. Your answers will appear here.</p>
      {:else}
        <p class="meta">
          {data.stats.correct} right out of {data.stats.total} so far.
        </p>
        <ul class="attempts">
          {#each data.attempts as a (a.id)}
            <li>
              <details>
                <summary>
                  <strong>{a.word}</strong>
                  <span class="badge" class:ok={a.correct}>{a.correct ? 'Right' : 'Missed'}</span>
                  {#if a.flagged}<span class="badge">Marked unclear</span>{/if}
                  <span class="meta">{when(a.createdAt)}</span>
                </summary>
                <p class="passage">
                  {a.item.before}<mark>{a.item.options[a.item.correctIndex].word}</mark>{a.item
                    .after}
                </p>
                <p>
                  You chose <strong>{a.item.options[a.chosenIndex]?.word}</strong>. {a.item.reason}
                </p>
              </details>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}
</article>

<ConfettiBurst fire={chosen >= 0 && item?.correctIndex === chosen} />

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
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .head h1 {
    margin: 0;
  }
  .kicker {
    margin: 0;
    font-family: var(--font-hand);
    font-size: 1.5rem;
    color: var(--ink-soft);
  }
  .target {
    font-family: var(--font-ui);
    font-size: 0.95rem;
    margin-left: var(--space-2);
  }
  .card {
    border-top: 8px solid var(--grape);
  }
  .loading {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .loading p {
    margin: 0;
    font-family: var(--font-ui);
    font-size: 1.15rem;
  }
  .setup {
    display: grid;
    gap: var(--space-4);
  }
  .notice {
    margin: 0;
    padding: var(--space-3);
    background: var(--surface-2);
    border-radius: var(--radius-1);
  }
  .tabs {
    display: flex;
    gap: var(--space-2);
  }
  .tabs button {
    font: inherit;
    font-family: var(--font-ui);
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--grape-deep);
    border-color: var(--grape-deep);
    color: #fff;
  }
  .panel {
    display: grid;
    gap: var(--space-2);
  }
  label,
  legend {
    font-weight: 700;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  fieldset label {
    font-weight: 400;
  }
  legend {
    padding: 0;
    margin-bottom: var(--space-1);
  }
  input[type='search'],
  input[type='text'],
  select {
    font: inherit;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
    max-width: 24rem;
  }
  .field {
    display: grid;
    gap: var(--space-1);
  }
  .wordlist {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    max-height: 12rem;
    overflow: auto;
  }
  .pick {
    font: inherit;
    padding: var(--space-1) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
  }
  .pick.on {
    background: var(--grape-deep);
    border-color: var(--grape-deep);
    color: #fff;
  }
  .meta {
    margin: 0;
    color: var(--ink-soft);
    font-size: 0.92rem;
  }
  .check {
    font-weight: 400;
  }
  .problem {
    margin: 0;
    min-height: 1.4em;
    font-weight: 700;
  }
  .row,
  .after {
    display: flex;
    gap: var(--space-4);
    align-items: center;
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }
  .btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .link {
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
  .hidden {
    display: none;
  }
  .history h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0 0 var(--space-2);
  }
  .attempts {
    list-style: none;
    margin: var(--space-3) 0 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  summary {
    cursor: pointer;
    display: flex;
    gap: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
  }
  .badge {
    padding: 0 var(--space-2);
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    font-size: 0.85rem;
    font-weight: 700;
  }
  .badge.ok {
    background: color-mix(in srgb, var(--mint) 30%, var(--surface));
  }
  .passage {
    font-family: var(--font-word);
  }
  mark {
    background: color-mix(in srgb, var(--mint) 35%, var(--surface));
    color: var(--ink);
    padding: 0 0.2em;
    border-radius: var(--radius-1);
  }
</style>
