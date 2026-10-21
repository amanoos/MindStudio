<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { ArrowLeft } from 'lucide-svelte'
  import FlipCard from '#lib/components/FlipCard.svelte'
  import EtymologyTimeline from '#lib/components/EtymologyTimeline.svelte'
  import ConfidenceBadge from '#lib/components/ConfidenceBadge.svelte'
  import SourceList from '#lib/components/SourceList.svelte'
  import NoteEditor from '#lib/components/NoteEditor.svelte'
  import ReportIssue from '#lib/components/ReportIssue.svelte'

  let { data } = $props()
  const w = $derived(data.word)
  const c = $derived(w.content)

  const stateLabels = {
    new: 'New',
    learning: 'Learning',
    familiar: 'Familiar',
    mastered: 'Mastered',
    revisit: 'Revisit'
  }
  const stateLabel = $derived(
    stateLabels[/** @type {keyof typeof stateLabels} */ (w.review.state)] ?? w.review.state
  )
  let revisited = $state(false)
</script>

<svelte:head><title>{w.headword} · Mind Studio</title></svelte:head>

<a class="back" href={resolve('/')}><ArrowLeft size={18} aria-hidden="true" /> Today</a>

<div class="hero pop-in">
  <FlipCard accent="grape">
    {#snippet front()}
      <h1 class="headword">{w.headword}</h1>
      <p class="pron"><span class="visually-hidden">Pronounced </span>{c.pronunciation}</p>
      <p class="pos">{w.pos}</p>
    {/snippet}
    {#snippet back()}
      <p class="def">{c.definition}</p>
      <p class="register">{c.register}</p>
    {/snippet}
  </FlipCard>
  <p class="meta">
    <ConfidenceBadge confidence={w.confidence} />
    <span class="chip">{stateLabel}</span>
    <span class="chip">{w.topic}</span>
    <span class="chip">First featured {w.firstFeatured}</span>
  </p>
</div>

<div class="sections">
  <section class="card pop-in" style="--i: 1">
    <h2>Meaning and nuance</h2>
    <p><strong>Definition.</strong> {c.definition}</p>
    <p><strong>Register.</strong> {c.register}</p>
    <p>{c.nuance}</p>
  </section>

  <section class="card pop-in" style="--i: 2">
    <h2>Related words, and how they differ</h2>
    <dl>
      {#each c.synonyms as s (s.word)}
        <dt>{s.word}</dt>
        <dd>{s.distinction}</dd>
      {/each}
    </dl>
    {#if c.antonyms?.length}
      <p class="ants">
        <strong>Opposites:</strong>
        {#each c.antonyms as a (a)}<span class="chip">{a}</span>{/each}
      </p>
    {/if}
  </section>

  <section class="card pop-in" style="--i: 3">
    <h2>In a sentence</h2>
    <ul class="examples">
      {#each c.examples as ex, i (i)}
        <li>
          <q>{ex.text}</q>
          <span class="tag"
            >{ex.kind === 'everyday' ? 'Everyday' : 'Richer'} · written for this app</span
          >
        </li>
      {/each}
    </ul>
    <p><strong>Usage.</strong> {c.currentUsage}</p>
  </section>

  <section class="card pop-in" style="--i: 4">
    <h2>Word history</h2>
    <ConfidenceBadge confidence={c.etymology.confidence} />
    <EtymologyTimeline summary={c.etymology.summary} />
    {#if c.historicalNotes}<p>{c.historicalNotes}</p>{/if}
    <p class="memory">
      <span class="label">Memory hook</span>
      {c.memoryHook}
    </p>
  </section>

  <section class="card pop-in" style="--i: 5">
    <h2>Your turn</h2>
    <p class="practice">{c.practice.prompt}</p>
    <NoteEditor note={w.note} />
  </section>

  <section class="card pop-in" style="--i: 6">
    <h2>Sources</h2>
    <SourceList sources={w.sources} />
    <p class="about">
      <strong>About our sources.</strong> Entries are written for this app by an AI assistant from published
      references, and are not independently fact-checked by a person. Every historical claim links to
      a source above, and uncertain histories say so. Please report anything that looks off.
    </p>
    <div class="actions">
      <form
        method="POST"
        action="?/revisit"
        use:enhance={() =>
          async ({ result }) => {
            revisited = result.type === 'success'
          }}
      >
        <button class="btn" type="submit">Revisit this word soon</button>
        <span role="status">{revisited ? 'Added to your review queue ✓' : ''}</span>
      </form>
      <ReportIssue />
    </div>
  </section>
</div>

<style>
  .back {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
    font-family: var(--font-ui);
    font-weight: 500;
  }
  .hero {
    display: grid;
    gap: var(--space-4);
    max-width: 40rem;
    margin: 0 auto var(--space-6);
  }
  .headword {
    font-family: var(--font-word);
    font-weight: 600;
    font-size: clamp(2.4rem, 8vw, 4rem);
    margin: 0;
  }
  .pron {
    margin: 0;
    font-size: 1.3rem;
    color: var(--ink-soft);
  }
  .pos {
    margin: 0;
    font-style: italic;
  }
  .def {
    font-family: var(--font-word);
    font-size: clamp(1.2rem, 3vw, 1.6rem);
    margin: 0;
  }
  .register {
    margin: 0;
    color: var(--ink-soft);
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
    margin: 0;
  }
  .chip {
    padding: var(--space-1) var(--space-3);
    border-radius: var(--radius-pill);
    border: 2px solid var(--line);
    font-size: 0.9rem;
  }
  .sections {
    display: grid;
    gap: var(--space-4);
    max-width: 48rem;
    margin: 0 auto;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: var(--space-2) var(--space-4);
    margin: 0 0 var(--space-3);
  }
  dt {
    font-family: var(--font-word);
    font-weight: 600;
  }
  dd {
    margin: 0;
  }
  .examples {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-3);
    display: grid;
    gap: var(--space-3);
  }
  q {
    display: block;
    font-family: var(--font-word);
    font-size: 1.15rem;
  }
  .tag {
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .memory {
    margin-top: var(--space-4);
    padding: var(--space-3) var(--space-4);
    background: var(--surface-2);
    border-radius: var(--radius-2);
    font-family: var(--font-hand);
    font-size: 1.4rem;
    line-height: 1.3;
  }
  .label {
    display: block;
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-soft);
  }
  .practice {
    font-family: var(--font-word);
    font-size: 1.2rem;
  }
  .about {
    margin-top: var(--space-4);
    font-size: 0.95rem;
    color: var(--ink-soft);
  }
  .actions {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-4);
  }
  .actions form {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }
</style>
