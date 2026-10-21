<script>
  import '#lib/styles/base.css'
  import '@fontsource/fredoka/500.css'
  import '@fontsource/fredoka/600.css'
  import '@fontsource/nunito/400.css'
  import '@fontsource/nunito/700.css'
  import '@fontsource/fraunces/600.css'
  import '@fontsource/caveat/500.css'
  import { page, navigating } from '$app/state'
  import { resolve } from '$app/paths'
  import { onNavigate } from '$app/navigation'
  import {
    BookOpenText,
    Repeat2,
    Library,
    Sparkles,
    PenLine,
    ChartNoAxesColumn,
    Settings
  } from 'lucide-svelte'
  import Mascot from '#lib/components/Mascot.svelte'
  import ThemeToggle from '#lib/components/ThemeToggle.svelte'

  let { children } = $props()

  const links = /** @type {const} */ ([
    { href: '/', label: 'Today', icon: BookOpenText },
    { href: '/review', label: 'Review', icon: Repeat2 },
    { href: '/wordbook', label: 'Wordbook', icon: Library },
    { href: '/studio', label: 'Studio', icon: Sparkles },
    { href: '/exercise', label: 'Exercise', icon: PenLine },
    { href: '/progress', label: 'Progress', icon: ChartNoAxesColumn },
    { href: '/settings', label: 'Settings', icon: Settings }
  ])

  /** @param {string} href */
  const current = (href) =>
    href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href)

  onNavigate((navigation) => {
    if (!document.startViewTransition) return
    return new Promise((done) => {
      document.startViewTransition(async () => {
        done()
        await navigation.complete
      })
    })
  })
</script>

{#if navigating.to}
  <div class="loadbar" role="progressbar" aria-label="Loading the next page"></div>
{/if}

<a class="skip" href="#main">Skip to content</a>

<header class="top">
  <a class="brand" href={resolve('/')} aria-label="Vocabulary and Mind Studio, home">
    <Mascot size={52} label="" />
    <span>Mind Studio</span>
  </a>
  <nav aria-label="Main" hidden={page.url.pathname === '/login'}>
    <ul>
      {#each links as { href, label, icon: Icon } (href)}
        <li>
          <a href={resolve(href)} aria-current={current(href) ? 'page' : undefined}>
            <Icon aria-hidden="true" size={20} />
            <span>{label}</span>
          </a>
        </li>
      {/each}
    </ul>
  </nav>
  <ThemeToggle />
</header>

<main id="main">
  {@render children()}
</main>

<style>
  .loadbar {
    position: fixed;
    inset: 0 0 auto 0;
    height: 4px;
    z-index: 30;
    background: linear-gradient(
      90deg,
      var(--grape),
      var(--coral),
      var(--sun),
      var(--mint),
      var(--grape)
    );
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }
  .skip {
    position: absolute;
    left: -999px;
    top: 0;
    background: var(--sun);
    color: #2a1f4d;
    padding: var(--space-3) var(--space-4);
    z-index: 20;
  }
  .skip:focus {
    left: var(--space-4);
    top: var(--space-3);
  }

  .top {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-5);
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(10px);
    border-bottom: 2px solid var(--line);
  }
  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
    color: var(--ink);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 1.35rem;
  }
  nav {
    flex: 1;
  }
  ul {
    display: flex;
    gap: var(--space-1);
    list-style: none;
    margin: 0;
    padding: 0;
    justify-content: center;
    flex-wrap: wrap;
  }
  nav a {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    color: var(--ink);
    text-decoration: none;
    font-family: var(--font-ui);
    font-weight: 500;
    transition:
      background var(--dur-fast),
      transform var(--dur-fast) var(--ease-bounce);
  }
  nav a:hover {
    background: var(--surface-2);
    transform: translateY(-2px);
  }
  nav a[aria-current='page'] {
    background: var(--grape-deep);
    color: #fff;
  }

  main {
    max-width: 68rem;
    margin: 0 auto;
    padding: var(--space-6) var(--space-5) 7rem;
  }

  /* Mobile: the nav becomes a bottom tab bar. */
  @media (max-width: 900px) {
    .top {
      padding: var(--space-2) var(--space-4);
      justify-content: space-between;
      backdrop-filter: none; /* would trap the fixed bottom nav inside the header */
    }
    nav {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 10;
      background: var(--surface);
      border-top: 2px solid var(--line);
      padding: var(--space-1) var(--space-2) calc(var(--space-1) + env(safe-area-inset-bottom));
    }
    ul {
      justify-content: space-between;
      flex-wrap: nowrap;
      gap: 0;
    }
    li {
      flex: 1 1 0;
      min-width: 0;
    }
    nav a {
      flex-direction: column;
      align-items: center;
      gap: 0;
      padding: var(--space-1) 2px;
      font-size: 0.66rem;
      border-radius: var(--radius-1);
    }
  }
</style>
