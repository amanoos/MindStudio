<script>
  import { resolve } from '$app/paths'
  import Mascot from '#lib/components/Mascot.svelte'
  import Garden from '#lib/components/Garden.svelte'

  let { data } = $props()
  const s = $derived(data.stats)

  const ratingMax = $derived(Math.max(1, ...Object.values(s.ratings)))
  const ratingRows = [
    ['again', 'Again', 'coral'],
    ['hard', 'Hard', 'sun'],
    ['good', 'Good', 'mint'],
    ['easy', 'Easy', 'sky']
  ]
  const hasQuiz = $derived(s.weeks.some((w) => w.accuracy !== null))
  const weekdays = $derived(
    s.strip.map((d) => ({
      ...d,
      day: new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC'
      })
    }))
  )
  const activeThisWeek = $derived(s.strip.filter((d) => d.active).length)
</script>

<svelte:head><title>Progress · Mind Studio</title></svelte:head>

<header class="head pop-in">
  <Mascot mood={s.encountered ? 'cheer' : 'happy'} size={96} />
  <div>
    <h1>Your progress</h1>
    <p>A friendly look at your practice. No grades, just a picture of how it is going.</p>
  </div>
</header>

<ul class="stats">
  <li class="card pop-in" style="--i: 1; --c: var(--grape)">
    <strong>{s.encountered}</strong><span>words met</span>
  </li>
  <li class="card pop-in" style="--i: 2; --c: var(--mint)">
    <strong>{s.byState.mastered}</strong><span>fully grown</span>
  </li>
  <li class="card pop-in" style="--i: 3; --c: var(--sun)">
    <strong>{s.due}</strong><span>due for review</span>
  </li>
  <li class="card pop-in" style="--i: 4; --c: var(--coral)">
    <strong>{s.streak}</strong><span>{s.streak === 1 ? 'day' : 'days'} in a row</span>
  </li>
  <li class="card pop-in" style="--i: 5; --c: var(--sky)">
    <strong>{s.activitiesTried}</strong><span>Mind Studio tried</span>
  </li>
</ul>

<div class="two">
  <section class="card pop-in" style="--i: 6">
    <h2>Recall over four weeks</h2>
    {#if hasQuiz}
      <ol class="bars">
        {#each s.weeks as w (w.start)}
          <li>
            <span
              class="col"
              role="img"
              aria-label="{w.label}: {w.accuracy === null
                ? 'no quiz answers'
                : `${w.accuracy} percent correct from ${w.checked} answers`}"
            >
              <span class="fill" style="height: {w.accuracy ?? 0}%"></span>
            </span>
            <span class="pct">{w.accuracy === null ? '·' : `${w.accuracy}%`}</span>
            <span class="lbl">{w.label}</span>
          </li>
        {/each}
      </ol>
      <p class="hint">
        Share of multiple-choice and fill-in answers you got right. Flashcards you rate yourself are
        not counted here.
      </p>
    {:else}
      <p class="hint">
        Answer a few review questions and your recall will appear here, week by week.
      </p>
      <a class="btn" href={resolve('/review')}>Start a review</a>
    {/if}
  </section>

  <section class="card pop-in" style="--i: 7">
    <h2>Consistency</h2>
    <ol class="strip" aria-label="The last seven days">
      {#each weekdays as d (d.date)}
        <li class:on={d.active}>
          <span
            class="dotbig"
            role="img"
            aria-label="{d.day}: {d.active ? 'practiced' : 'rest day'}"
          ></span>
          <span class="lbl">{d.day}</span>
        </li>
      {/each}
    </ol>
    <p class="hint">
      {activeThisWeek === 0
        ? 'A quiet week so far. Whenever you are ready, a few minutes is plenty.'
        : `${activeThisWeek} of the last 7 days. Rest days are part of learning.`}
    </p>
  </section>
</div>

<section class="card pop-in" style="--i: 8">
  <h2>How it felt</h2>
  <p class="hint">Your own ratings over the last four weeks.</p>
  {#if Object.values(s.ratings).some((n) => n > 0)}
    <ul class="ratings">
      {#each ratingRows as [key, label, color] (key)}
        <li style="--c: var(--{color})">
          <span class="rl">{label}</span>
          <span class="track"
            ><span class="rf" style="width: {(s.ratings[key] / ratingMax) * 100}%"></span></span
          >
          <span class="rn">{s.ratings[key]}</span>
        </li>
      {/each}
    </ul>
  {:else}
    <p>No ratings yet. They show up after your first review.</p>
  {/if}
</section>

<section class="card pop-in" style="--i: 9">
  <h2>Your word garden</h2>
  <p class="hint">
    Every word you meet is planted. It grows as you practice: <strong>seed</strong>,
    <strong>sprout</strong>, <strong>bloom</strong>, <strong>fully grown</strong>. A thirsty plant
    just needs a quick review.
  </p>
  {#if s.garden.length}
    <Garden words={s.garden} />
  {:else}
    <p>Your garden is waiting for its first seed. Open today's words to plant it.</p>
    <a class="btn" href={resolve('/')}>See today's words</a>
  {/if}
</section>

<p class="note">
  These numbers describe your practice only. They are not a measure of your health, memory or
  intelligence.
</p>

<style>
  .head {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
    margin-bottom: var(--space-5);
  }
  .head p {
    margin: 0;
    color: var(--ink-soft);
  }
  .stats {
    list-style: none;
    margin: 0 0 var(--space-5);
    padding: 0;
    display: grid;
    gap: var(--space-3);
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
  }
  .stats li {
    display: grid;
    border-top: 8px solid var(--c);
    padding: var(--space-3) var(--space-4);
  }
  .stats strong {
    font-family: var(--font-ui);
    font-size: 2.2rem;
    line-height: 1.1;
  }
  .stats span {
    color: var(--ink-soft);
  }
  .two {
    display: grid;
    gap: var(--space-4);
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    margin-bottom: var(--space-4);
  }
  section.card {
    margin-bottom: var(--space-4);
  }
  .two section.card {
    margin-bottom: 0;
  }
  h2 {
    margin-bottom: var(--space-3);
  }
  .hint {
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
  .bars {
    list-style: none;
    margin: 0 0 var(--space-3);
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-3);
    align-items: end;
  }
  .bars li {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
  }
  .col {
    display: flex;
    align-items: flex-end;
    width: 100%;
    max-width: 3.6rem;
    height: 7.5rem;
    border-radius: var(--radius-1);
    background: var(--surface-2);
    overflow: hidden;
  }
  .fill {
    width: 100%;
    background: linear-gradient(var(--mint), var(--sky));
    border-radius: var(--radius-1) var(--radius-1) 0 0;
    transition: height calc(var(--dur-slow) * 2) var(--ease-out);
  }
  .pct {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .lbl {
    font-size: 0.8rem;
    color: var(--ink-soft);
    text-align: center;
  }
  .strip {
    list-style: none;
    margin: 0 0 var(--space-3);
    padding: 0;
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }
  .strip li {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
  }
  .dotbig {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 3px solid var(--line);
    background: var(--surface-2);
    transition: transform var(--dur-med) var(--ease-bounce);
  }
  .strip li.on .dotbig {
    background: var(--mint);
    border-color: var(--ink);
    transform: scale(1.12);
  }
  .ratings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  .ratings li {
    display: grid;
    grid-template-columns: 4.5rem 1fr 2.5rem;
    align-items: center;
    gap: var(--space-3);
  }
  .track {
    height: 1rem;
    border-radius: var(--radius-pill);
    background: var(--surface-2);
    overflow: hidden;
  }
  .rf {
    display: block;
    height: 100%;
    background: var(--c);
    border-radius: var(--radius-pill);
    transition: width calc(var(--dur-slow) * 2) var(--ease-out);
  }
  .rn {
    text-align: right;
    font-weight: 700;
  }
  .note {
    color: var(--ink-soft);
    font-size: 0.9rem;
    max-width: 40rem;
  }
</style>
