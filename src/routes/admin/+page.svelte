<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { ArrowLeft, CircleCheck, TriangleAlert } from 'lucide-svelte'

  let { data } = $props()
  const o = $derived(data.overview)

  /** @param {string} iso */
  const when = (iso) => iso.replace('T', ' ').slice(0, 16)
</script>

<svelte:head><title>Content admin · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/settings')}><ArrowLeft size={18} aria-hidden="true" /> Settings</a>

<h1 class="pop-in">Content admin</h1>
<p class="lead">
  A quiet look behind the scenes: how many fresh words are left, what readers have flagged, and
  whether the no-repeat rules are holding.
</p>

<ul class="stats">
  <li class="card" class:warn={o.lowReserve}>
    <strong>{o.words.reserve}</strong><span>unused words in reserve</span>
  </li>
  <li class="card"><strong>{o.words.featured}</strong><span>words featured so far</span></li>
  <li class="card"><strong>{o.words.published}</strong><span>words in the library</span></li>
  <li class="card"><strong>{o.words.uncertain}</strong><span>with an uncertain history</span></li>
</ul>

{#if o.lowReserve}
  <p class="alert" role="alert">
    <TriangleAlert size={18} aria-hidden="true" /> The reserve is below five words, so a new daily set
    cannot be published. Add more words to <code>content/words</code> and redeploy.
  </p>
{/if}

<div class="two">
  <section class="card">
    <h2>Integrity checks</h2>
    <p class="hint">
      The database enforces these rules itself. This audit proves they hold, and would catch trouble
      from a bad restore or a manual edit.
    </p>
    <ul class="checks">
      {#each o.checks as c (c.name)}
        <li class:bad={!c.ok}>
          {#if c.ok}<CircleCheck size={20} aria-label="Passed" />{:else}<TriangleAlert
              size={20}
              aria-label="Problem"
            />{/if}
          <span
            >{c.name}{#if !c.ok}
              <strong>({c.problems} found)</strong>{/if}</span
          >
        </li>
      {/each}
    </ul>
  </section>

  <section class="card">
    <h2>Unused words by topic</h2>
    {#if o.words.byTopic.length}
      <ul class="topics">
        {#each o.words.byTopic as t (t.topic)}
          <li><span>{t.topic}</span><strong>{t.n}</strong></li>
        {/each}
      </ul>
    {:else}
      <p class="hint">Nothing left in reserve.</p>
    {/if}
  </section>
</div>

<section class="card">
  <h2>Reports from readers ({o.openIssues} open)</h2>
  {#if o.issues.length === 0}
    <p class="hint">
      No reports yet. The "Report an issue" button on each word page sends them here.
    </p>
  {:else}
    <ul class="issues">
      {#each o.issues as i (i.id)}
        <li class:done={i.resolved}>
          <div>
            <p class="who">
              {#if i.slug}<a href={resolve('/word/[slug]', { slug: i.slug })}>{i.headword}</a>
              {:else}A general note{/if}
              <span class="field">{i.field}</span>
              <span class="when">{when(i.createdAt)}</span>
            </p>
            <p class="comment">{i.comment || '(no comment)'}</p>
          </div>
          <form method="POST" action="?/resolve" use:enhance>
            <input type="hidden" name="id" value={i.id} />
            <input type="hidden" name="resolved" value={i.resolved ? '0' : '1'} />
            <button class="btn small" type="submit"
              >{i.resolved ? 'Reopen' : 'Mark resolved'}</button
            >
          </form>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<section class="card">
  <h2>Content loads</h2>
  <p class="hint">Each time the app starts with new or changed content, it records a line here.</p>
  {#if o.runs.length}
    <ul class="runs">
      {#each o.runs as r (r.id)}
        <li>
          <span class="when">{when(r.startedAt)}</span> <strong>{r.status}</strong>
          {r.detail}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="hint">No loads recorded yet.</p>
  {/if}
</section>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 500;
  }
  .lead {
    color: var(--ink-soft);
    max-width: 42rem;
  }
  .stats {
    list-style: none;
    margin: 0 0 var(--space-4);
    padding: 0;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }
  .stats li {
    display: grid;
    padding: var(--space-3) var(--space-4);
  }
  .stats strong {
    font-family: var(--font-ui);
    font-size: 2rem;
    line-height: 1.1;
  }
  .stats span {
    color: var(--ink-soft);
  }
  .stats .warn {
    border-color: var(--coral);
  }
  .alert {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--coral);
    border-radius: var(--radius-2);
    background: color-mix(in srgb, var(--coral) 18%, var(--surface));
  }
  .two {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
    margin-bottom: var(--space-4);
  }
  section.card {
    margin-bottom: var(--space-4);
  }
  .two section.card {
    margin-bottom: 0;
  }
  .hint {
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .checks li {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
    padding: var(--space-1) 0;
  }
  .checks :global(svg) {
    flex: none;
    color: var(--mint);
  }
  .checks li.bad :global(svg) {
    color: var(--coral);
  }
  .topics li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-1) 0;
    border-bottom: 1px dashed var(--line);
    text-transform: capitalize;
  }
  .issues li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-4);
    align-items: flex-start;
    padding: var(--space-3) 0;
    border-bottom: 2px solid var(--line);
  }
  .issues li.done {
    opacity: 0.65;
  }
  .who {
    margin: 0;
    font-weight: 700;
  }
  .field {
    margin-left: var(--space-2);
    padding: 0 var(--space-2);
    border: 2px solid var(--line);
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    font-weight: 400;
    text-transform: capitalize;
  }
  .when {
    color: var(--ink-soft);
    font-size: 0.85rem;
    font-weight: 400;
  }
  .comment {
    margin: var(--space-1) 0 0;
  }
  .btn.small {
    font-size: 0.9rem;
    padding: var(--space-2) var(--space-4);
    white-space: nowrap;
  }
  .runs li {
    padding: var(--space-1) 0;
    border-bottom: 1px dashed var(--line);
  }
</style>
