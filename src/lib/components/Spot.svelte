<script>
  /**
   * A small decorative illustration for a word's topic. Always hidden from assistive technology,
   * because the topic is already written next to it.
   * @type {{ topic: string, size?: number }}
   */
  let { topic, size = 56 } = $props()

  const kind = $derived(
    topic.includes('literature')
      ? 'book'
      : topic.includes('work')
        ? 'talk'
        : topic.includes('science')
          ? 'flask'
          : topic.includes('philosophy')
            ? 'bulb'
            : topic.includes('arts')
              ? 'scroll'
              : topic.includes('society')
                ? 'people'
                : topic.includes('social')
                  ? 'rings'
                  : topic.includes('story')
                    ? 'sparkle'
                    : 'target'
  )
</script>

<svg
  class="spot"
  viewBox="0 0 48 48"
  width={size}
  height={size}
  aria-hidden="true"
  focusable="false"
>
  {#if kind === 'book'}
    <path d="M24 12q-8-4-17-2v26q9-2 17 2z" class="fill" />
    <path d="M24 12q8-4 17-2v26q-9-2-17 2z" class="fill alt" />
    <path d="M24 12v26" />
    <path d="M11 18q5-1 9 1M11 24q5-1 9 1M28 19q4-2 9-1M28 25q4-2 9-1" />
  {:else if kind === 'talk'}
    <path
      d="M6 10h24a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H17l-7 6v-6H6a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3z"
      class="fill"
    />
    <path
      d="M28 20h14a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-2v5l-6-5h-6a3 3 0 0 1-3-3v-2"
      class="fill alt"
    />
  {:else if kind === 'flask'}
    <path d="M19 6h10M21 6v13L9 38a4 4 0 0 0 3.6 6h22.8A4 4 0 0 0 39 38L27 19V6" class="fill" />
    <path d="M14 33h20" />
    <circle cx="20" cy="38" r="2" class="alt" />
    <circle cx="28" cy="36" r="1.5" class="alt" />
  {:else if kind === 'bulb'}
    <path d="M24 5a13 13 0 0 0-7 24v5h14v-5a13 13 0 0 0-7-24z" class="fill" />
    <path d="M18 39h12M20 43h8M24 14v10M20 20l4 4 4-4" />
  {:else if kind === 'scroll'}
    <path d="M12 8h26a4 4 0 0 1 4 4v24a4 4 0 0 1-4 4H14a4 4 0 0 1-4-4V12" class="fill" />
    <path d="M12 8a4 4 0 0 0-4 4v2h6" />
    <path d="M18 18h18M18 25h18M18 32h12" />
  {:else if kind === 'people'}
    <circle cx="24" cy="15" r="6" class="fill" />
    <circle cx="11" cy="22" r="5" class="fill alt" />
    <circle cx="37" cy="22" r="5" class="fill alt" />
    <path d="M13 42a11 11 0 0 1 22 0zM2 40a9 9 0 0 1 12-8M46 40a9 9 0 0 0-12-8" class="fill" />
  {:else if kind === 'rings'}
    <circle cx="18" cy="24" r="12" class="fill" />
    <circle cx="30" cy="24" r="12" class="fill alt" />
  {:else if kind === 'sparkle'}
    <path d="M24 4l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" class="fill" />
    <path d="M39 6l1.5 4.5L45 12l-4.5 1.5L39 18l-1.5-4.5L33 12l4.5-1.5z" class="fill alt" />
  {:else}
    <circle cx="24" cy="24" r="18" class="fill" />
    <circle cx="24" cy="24" r="11" class="alt" />
    <circle cx="24" cy="24" r="4" class="fill" />
    <path d="M24 2v8M24 38v8M2 24h8M38 24h8" />
  {/if}
</svg>

<style>
  .spot {
    display: block;
    fill: none;
    stroke: #2a1f4d;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .fill {
    fill: var(--c, var(--grape));
  }
  .alt {
    fill: var(--sun);
  }
</style>
