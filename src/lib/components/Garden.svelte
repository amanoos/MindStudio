<script>
  import { resolve } from '$app/paths'

  /** @type {{ words: { id: number, slug: string, headword: string, state: string }[] }} */
  let { words } = $props()

  const accents = ['grape', 'sun', 'coral', 'mint', 'sky']
  const stateLabel = {
    new: 'just planted',
    learning: 'sprouting',
    familiar: 'in bloom',
    mastered: 'fully grown',
    revisit: 'needs water'
  }
  /** @param {string} s */
  const label = (s) => stateLabel[/** @type {keyof typeof stateLabel} */ (s)] ?? s
</script>

<ul class="garden">
  {#each words as w, i (w.id)}
    <li class="plot" style="--c: var(--{accents[i % 5]}); --i: {i % 7}">
      <a href={resolve('/word/[slug]', { slug: w.slug })}>
        <svg
          viewBox="0 0 48 56"
          width="64"
          height="74"
          role="img"
          aria-label="{w.headword}, {label(w.state)}"
        >
          <ellipse cx="24" cy="50" rx="17" ry="5" class="soil" />
          {#if w.state === 'new'}
            <ellipse cx="24" cy="46" rx="6" ry="3.5" class="seed" />
          {:else if w.state === 'learning'}
            <g class="sway">
              <path d="M24 48V32" class="stem" />
              <path d="M24 38q-9-1-10-9q8 0 10 9z" class="leaf" />
              <path d="M24 34q8-1 10-9q-8 0-10 9z" class="leaf" />
            </g>
          {:else if w.state === 'familiar'}
            <g class="sway">
              <path d="M24 48V24" class="stem" />
              <path d="M24 40q-9-1-10-8q8 0 10 8z" class="leaf" />
              <path d="M24 35q8-1 10-8q-8 0-10 8z" class="leaf" />
              <g class="petals" transform="translate(24 18)">
                <circle r="4.2" cx="0" cy="-6" /><circle r="4.2" cx="5.7" cy="-1.9" />
                <circle r="4.2" cx="3.5" cy="4.9" /><circle r="4.2" cx="-3.5" cy="4.9" />
                <circle r="4.2" cx="-5.7" cy="-1.9" />
                <circle r="3" class="heart" />
              </g>
            </g>
          {:else if w.state === 'mastered'}
            <g class="sway">
              <path d="M24 49V28" class="trunk" />
              <circle cx="24" cy="20" r="14" class="canopy" />
              <circle cx="17" cy="23" r="3" class="fruit" />
              <circle cx="29" cy="16" r="3" class="fruit" />
              <circle cx="26" cy="26" r="2.5" class="fruit" />
            </g>
          {:else}
            <g>
              <path d="M24 48V30q0-8 8-10" class="stem" />
              <path d="M32 20q4 2 4 6q-5-1-4-6z" class="leaf dry" />
              <path d="M24 38q-7 1-9 8q7-1 9-8z" class="leaf dry" />
              <path d="M38 8q-3 4 0 7q3-3 0-7z" class="drop" />
            </g>
          {/if}
        </svg>
        <span class="name">{w.headword}</span>
      </a>
    </li>
  {/each}
</ul>

<style>
  .garden {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr));
    gap: var(--space-3);
  }
  .plot a {
    display: grid;
    justify-items: center;
    gap: var(--space-1);
    padding: var(--space-2);
    border-radius: var(--radius-2);
    text-decoration: none;
    color: var(--ink);
    transition: background var(--dur-fast);
  }
  .plot a:hover {
    background: var(--surface-2);
  }
  .name {
    font-family: var(--font-word);
    font-size: 0.9rem;
    text-align: center;
    overflow-wrap: break-word;
  }
  .soil {
    fill: #8b6b4a;
  }
  .seed {
    fill: #5b3f26;
  }
  .stem,
  .trunk {
    fill: none;
    stroke: #3f9d6a;
    stroke-width: 3;
    stroke-linecap: round;
  }
  .trunk {
    stroke: #8b6b4a;
    stroke-width: 5;
  }
  .leaf {
    fill: #52c08a;
    stroke: #2a1f4d;
    stroke-width: 1.2;
    stroke-linejoin: round;
  }
  .leaf.dry {
    fill: #c8b27a;
  }
  .petals circle {
    fill: var(--c);
    stroke: #2a1f4d;
    stroke-width: 1.2;
  }
  .petals .heart {
    fill: #fbbf24;
  }
  .canopy {
    fill: #52c08a;
    stroke: #2a1f4d;
    stroke-width: 1.5;
  }
  .fruit {
    fill: var(--c);
    stroke: #2a1f4d;
    stroke-width: 1;
  }
  .drop {
    fill: #38bdf8;
    stroke: #2a1f4d;
    stroke-width: 1;
  }
  .sway {
    transform-origin: 24px 48px;
    animation: sway 4.5s ease-in-out infinite;
    animation-delay: calc(var(--i) * -0.6s);
  }
  @keyframes sway {
    0%,
    100% {
      transform: rotate(-2.5deg);
    }
    50% {
      transform: rotate(2.5deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion='full'])) .sway {
      animation: none;
    }
  }
  :global(:root[data-motion='reduce']) .sway {
    animation: none;
  }
</style>
