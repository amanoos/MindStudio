<script>
  import { ExternalLink } from 'lucide-svelte'

  /** @type {{ sources: { name: string, url: string, field: string, license: string | null, attribution: string | null }[] }} */
  let { sources } = $props()

  const labels = { etymology: 'Word history', history: 'Dated history', general: 'General' }
  /** @param {string} f */
  const label = (f) => labels[/** @type {keyof typeof labels} */ (f)] ?? f
</script>

<ul class="sources">
  {#each sources as s, i (i)}
    <li>
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
      <a href={s.url} target="_blank" rel="noopener noreferrer">
        {s.name}
        <ExternalLink size={14} aria-hidden="true" /><span class="visually-hidden"
          >(opens in a new tab)</span
        >
      </a>
      <span class="what">{label(s.field)}</span>
      {#if s.license}<span class="lic">· {s.license}</span>{/if}
      {#if s.attribution}<span class="lic">· {s.attribution}</span>{/if}
    </li>
  {/each}
</ul>

<style>
  .sources {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: var(--space-2);
  }
  a {
    font-weight: 700;
  }
  .what,
  .lic {
    color: var(--ink-soft);
    font-size: 0.92rem;
  }
</style>
