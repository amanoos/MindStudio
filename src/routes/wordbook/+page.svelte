<script>
  import { resolve } from '$app/paths'
  import { Heart, NotebookPen, Download, Search } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'

  let { data } = $props()

  const states = ['new', 'learning', 'familiar', 'mastered', 'revisit']
  const stateColor = {
    new: 'sky',
    learning: 'sun',
    familiar: 'mint',
    mastered: 'grape',
    revisit: 'coral'
  }
  const filtered = $derived(
    Boolean(
      data.filters.q ||
      data.filters.topic ||
      data.filters.state ||
      data.filters.favorites ||
      data.filters.tag ||
      data.filters.from ||
      data.filters.to
    )
  )
  /** @param {string} s */
  const color = (s) => stateColor[/** @type {keyof typeof stateColor} */ (s)] ?? 'sky'
</script>

<svelte:head><title>Wordbook · Mind Studio</title></svelte:head>

<header class="head pop-in">
  <div>
    <h1>My Wordbook</h1>
    <p class="count" role="status">
      {#if filtered}Showing {data.words.length} of {data.total} words{:else}{data.total}
        {data.total === 1 ? 'word' : 'words'} so far{/if}
    </p>
  </div>
  <details class="export">
    <summary class="btn"><Download size={18} aria-hidden="true" /> Export</summary>
    <ul>
      <li>
        <a href={resolve('/export/[file]', { file: 'wordbook.csv' })} data-sveltekit-reload download
          >Wordbook (CSV)</a
        >
      </li>
      <li>
        <a
          href={resolve('/export/[file]', { file: 'wordbook.json' })}
          data-sveltekit-reload
          download>Wordbook (JSON)</a
        >
      </li>
      <li>
        <a href={resolve('/export/[file]', { file: 'backup.json' })} data-sveltekit-reload download
          >Full backup (JSON)</a
        >
      </li>
    </ul>
  </details>
</header>

<form class="filters card" method="GET" action={resolve('/wordbook')} role="search">
  <label class="wide">
    <span>Search</span>
    <span class="field"
      ><Search size={18} aria-hidden="true" />
      <input
        type="search"
        name="q"
        value={data.filters.q}
        placeholder="Word, meaning, note or tag"
        maxlength="100"
      /></span
    >
  </label>
  <label>
    <span>Topic</span>
    <select name="topic">
      <option value="">Any</option>
      {#each data.topics as t (t)}<option value={t} selected={t === data.filters.topic}>{t}</option
        >{/each}
    </select>
  </label>
  <label>
    <span>Learning state</span>
    <select name="state">
      <option value="">Any</option>
      {#each states as s (s)}<option value={s} selected={s === data.filters.state}>{s}</option
        >{/each}
    </select>
  </label>
  <label>
    <span>Tag</span>
    <input name="tag" value={data.filters.tag} maxlength="30" />
  </label>
  <label>
    <span>Featured from</span>
    <input type="date" name="from" value={data.filters.from} />
  </label>
  <label>
    <span>Featured to</span>
    <input type="date" name="to" value={data.filters.to} />
  </label>
  <label>
    <span>Sort</span>
    <select name="sort">
      <option value="newest" selected={data.filters.sort === 'newest'}>Newest first</option>
      <option value="az" selected={data.filters.sort === 'az'}>A to Z</option>
      <option value="due" selected={data.filters.sort === 'due'}>Review due soonest</option>
    </select>
  </label>
  <label class="check">
    <input type="checkbox" name="favorites" value="1" checked={data.filters.favorites} />
    <span>Favorites only</span>
  </label>
  <div class="buttons">
    <button class="btn" type="submit">Apply</button>
    {#if filtered}<a class="clear" href={resolve('/wordbook')}>Clear filters</a>{/if}
  </div>
</form>

{#if data.words.length === 0}
  <section class="empty pop-in">
    <Mascot mood="sleep" size={110} />
    {#if filtered}
      <h2>No words match</h2>
      <p>Try fewer filters or a different search.</p>
    {:else}
      <h2>Your wordbook is empty</h2>
      <p>Words you meet on Today will collect here, with your notes and progress.</p>
    {/if}
  </section>
{:else}
  <ul class="results">
    {#each data.words as w, i (w.id)}
      <li class="row card pop-in" style="--i: {Math.min(i, 8)}; --c: var(--{color(w.state)})">
        <div class="main">
          <h2>
            <a class="stretch" href={resolve('/word/[slug]', { slug: w.slug })}>{w.headword}</a>
            <span class="pos">{w.pos}</span>
          </h2>
          <p class="def">{w.definition}</p>
          <p class="meta">
            {w.topic} · featured {w.firstFeatured}{#if w.tags}
              · {w.tags}{/if}
          </p>
        </div>
        <div class="side">
          <span class="state"><span class="dot" aria-hidden="true"></span>{w.state}</span>
          {#if w.favorite}<Heart
              size={18}
              fill="currentColor"
              class="fav"
              aria-label="Favorite"
            />{/if}
          {#if w.hasNote}<NotebookPen size={18} aria-label="Has a note" />{/if}
        </div>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-4);
  }
  .count {
    margin: 0;
    color: var(--ink-soft);
  }
  .export {
    position: relative;
  }
  .export summary {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    list-style: none;
  }
  .export summary::-webkit-details-marker {
    display: none;
  }
  .export ul {
    position: absolute;
    right: 0;
    z-index: 5;
    margin: var(--space-2) 0 0;
    padding: var(--space-2);
    list-style: none;
    background: var(--surface);
    border: 2px solid var(--line);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-2);
    min-width: 13rem;
  }
  .export a {
    display: block;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-1);
    text-decoration: none;
    color: var(--ink);
  }
  .export a:hover {
    background: var(--surface-2);
  }
  .filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--space-3);
    align-items: end;
    margin-bottom: var(--space-5);
  }
  .filters label {
    display: grid;
    gap: var(--space-1);
    font-weight: 700;
    font-size: 0.95rem;
  }
  .filters .wide {
    grid-column: 1 / -1;
  }
  .field {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: 0 var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
  }
  .field input {
    flex: 1;
    border: 0;
    background: transparent;
    padding: var(--space-3) 0;
    outline-offset: 6px;
  }
  select,
  input:not([type='checkbox']):not([type='search']) {
    padding: var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
  }
  select,
  input {
    font: inherit;
    color: var(--ink);
  }
  .check {
    display: flex !important;
    grid-template-columns: none;
    align-items: center;
    gap: var(--space-2);
    padding-bottom: var(--space-3);
  }
  .buttons {
    display: flex;
    gap: var(--space-4);
    align-items: center;
  }
  .clear {
    font-weight: 700;
  }
  .results {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-3);
  }
  .row {
    position: relative;
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4) var(--space-5);
    border-left: 10px solid var(--c);
    transition: transform var(--dur-fast) var(--ease-bounce);
  }
  .row:hover,
  .row:focus-within {
    transform: translateX(4px);
  }
  .row h2 {
    font-family: var(--font-word);
    font-size: 1.5rem;
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
  .pos {
    margin-left: var(--space-2);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    font-family: var(--font-body);
    font-size: 0.8rem;
    font-weight: 400;
  }
  .def {
    margin: var(--space-1) 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .meta {
    margin: 0;
    font-size: 0.9rem;
    color: var(--ink-soft);
  }
  .side {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
    flex: none;
  }
  .state {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-ui);
    font-weight: 500;
    text-transform: capitalize;
  }
  .dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: var(--c);
  }
  .side :global(.fav) {
    color: var(--coral);
  }
  .empty {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-2);
    padding-top: var(--space-5);
  }
</style>
