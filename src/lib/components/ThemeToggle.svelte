<script>
  import { onMount } from 'svelte'
  import { Sun, Moon } from 'lucide-svelte'

  let dark = $state(false)

  onMount(() => {
    const t = document.documentElement.dataset.theme
    dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  })

  function toggle() {
    dark = !dark
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch {
      /* storage unavailable: theme just won't persist */
    }
  }
</script>

<button class="toggle" onclick={toggle} aria-pressed={dark} aria-label="Dark mode">
  {#if dark}<Moon aria-hidden="true" />{:else}<Sun aria-hidden="true" />{/if}
</button>

<style>
  .toggle {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: var(--radius-pill);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease-bounce);
  }
  .toggle:hover {
    transform: rotate(15deg) scale(1.08);
  }
</style>
