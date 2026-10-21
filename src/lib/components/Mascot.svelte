<script>
  /** @type {{ mood?: 'happy'|'cheer'|'sleep', size?: number, label?: string }} */
  let { mood = 'happy', size = 96, label = 'Professor Hoot, the owl' } = $props()
</script>

<svg
  class="hoot {mood}"
  width={size}
  height={size}
  viewBox="0 0 120 120"
  role="img"
  aria-label={label}
>
  <g class="body">
    <path d="M30 18l12 14M90 18L78 32" stroke="#2a1f4d" stroke-width="5" stroke-linecap="round" />
    <ellipse cx="60" cy="68" rx="40" ry="44" fill="#fbbf24" stroke="#2a1f4d" stroke-width="4" />
    <path d="M32 84q28 26 56 0" fill="#fff3c4" stroke="none" />
    <g class="wing left"
      ><path
        d="M22 66q-12 20 6 38q6-22-6-38z"
        fill="#f59e0b"
        stroke="#2a1f4d"
        stroke-width="3"
      /></g
    >
    <g class="wing right"
      ><path
        d="M98 66q12 20-6 38q-6-22 6-38z"
        fill="#f59e0b"
        stroke="#2a1f4d"
        stroke-width="3"
      /></g
    >
    <g class="eyes">
      <circle cx="44" cy="54" r="15" fill="#fff" stroke="#2a1f4d" stroke-width="3" />
      <circle cx="76" cy="54" r="15" fill="#fff" stroke="#2a1f4d" stroke-width="3" />
      {#if mood === 'sleep'}
        <path
          d="M34 55q10 7 20 0M66 55q10 7 20 0"
          fill="none"
          stroke="#2a1f4d"
          stroke-width="3"
          stroke-linecap="round"
        />
      {:else}
        <g class="pupils">
          <circle cx="46" cy="55" r="6" fill="#2a1f4d" />
          <circle cx="74" cy="55" r="6" fill="#2a1f4d" />
          <circle cx="48" cy="52" r="2" fill="#fff" />
          <circle cx="76" cy="52" r="2" fill="#fff" />
        </g>
      {/if}
    </g>
    <path
      d="M54 66l6 11 6-11z"
      fill="#fb7185"
      stroke="#2a1f4d"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M38 22l22-10 22 10-22 10z"
      fill="#8b5cf6"
      stroke="#2a1f4d"
      stroke-width="3"
      stroke-linejoin="round"
    />
  </g>
</svg>

<style>
  .hoot {
    display: block;
    overflow: visible;
  }
  .body {
    transform-origin: 60px 100px;
    transition: transform var(--dur-med) var(--ease-bounce);
  }
  .hoot:hover .body {
    transform: rotate(-6deg);
  }
  .eyes {
    transform-origin: 60px 54px;
    animation: blink 5s infinite;
  }
  .cheer .body {
    animation: float 1.2s ease-in-out infinite;
  }
  .cheer .wing.left {
    transform-origin: 26px 70px;
    transform: rotate(-25deg);
  }
  .cheer .wing.right {
    transform-origin: 94px 70px;
    transform: rotate(25deg);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion='full'])) .eyes,
    :global(:root:not([data-motion='full'])) .cheer .body {
      animation: none;
    }
  }
  :global(:root[data-motion='reduce']) .eyes,
  :global(:root[data-motion='reduce']) .cheer .body {
    animation: none;
  }
</style>
