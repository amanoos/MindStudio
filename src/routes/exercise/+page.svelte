<script>
  import { onMount } from 'svelte'
  import { resolve } from '$app/paths'
  import { Scale } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import ClaudeKeyPanel from '#lib/components/ClaudeKeyPanel.svelte'
  import { readKey } from '#lib/ai/key-store.js'

  let connected = $state(false)
  onMount(() => {
    connected = readKey() !== null
  })
</script>

<svelte:head><title>Exercise · Mind Studio</title></svelte:head>

<header class="hello pop-in">
  <Mascot mood="cheer" size={100} />
  <div>
    <h1>Exercise</h1>
    <p>Practice that is written fresh for you each time, with a little help from Claude.</p>
  </div>
</header>

<ul class="types">
  <li class="type card pop-in" style="--i: 1">
    <span class="icon"><Scale size={30} aria-hidden="true" /></span>
    <h2>
      <a class="stretch" href={resolve('/exercise/word-nuance')}>Word Nuance</a>
    </h2>
    <p>
      A sentence with a gap. Several near-synonyms could fill it, but only one fits best. Pick it,
      then see why.
    </p>
    <p class="meta">
      {connected ? 'Ready to play' : 'Needs your Claude key (below)'}
    </p>
  </li>
</ul>

<ClaudeKeyPanel onchange={(c) => (connected = c)} />

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
    border-top: 10px solid var(--grape);
    transition:
      transform var(--dur-med) var(--ease-bounce),
      box-shadow var(--dur-med);
  }
  .type:hover,
  .type:focus-within {
    transform: translateY(-4px) rotate(-0.5deg);
  }
  .type h2 {
    margin: var(--space-2) 0;
  }
  .type p {
    margin: 0 0 var(--space-2);
  }
  .meta {
    color: var(--ink-soft);
    font-size: 0.92rem;
  }
  .icon {
    color: var(--grape-deep);
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
</style>
