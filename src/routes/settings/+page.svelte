<script>
  import { enhance } from '$app/forms'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  import { Download, Upload, LogOut } from 'lucide-svelte'
  import { readPrefs, setMotion, setTextSize, setTheme } from '#lib/prefs.js'

  let { data, form } = $props()

  /** @type {import('#lib/prefs.js').ThemePref} */
  let theme = $state('system')
  /** @type {import('#lib/prefs.js').MotionPref} */
  let motion = $state('system')
  /** @type {import('#lib/prefs.js').TextSizePref} */
  let textSize = $state('normal')

  onMount(() => {
    const prefs = readPrefs()
    theme = prefs.theme
    motion = prefs.motion
    textSize = prefs.textSize
  })

  const themes = [
    ['system', 'Match my device'],
    ['light', 'Light'],
    ['dark', 'Dark']
  ]
  const motions = [
    ['system', 'Match my device'],
    ['reduce', 'Calm: reduce animation'],
    ['full', 'Lively: full animation']
  ]
  const sizes = [
    ['small', 'Small'],
    ['normal', 'Normal'],
    ['large', 'Large'],
    ['xlarge', 'Extra large']
  ]

  let saved = $state(false)
  let restoring = $state(false)
</script>

<svelte:head><title>Settings · Mind Studio</title></svelte:head>

<h1 class="pop-in">Settings</h1>

<div class="grid">
  <section class="card pop-in" style="--i: 1">
    <h2>Your day</h2>
    <form
      method="POST"
      action="?/save"
      use:enhance={() =>
        async ({ result, update }) => {
          saved = result.type === 'success'
          await update({ reset: false })
        }}
    >
      <label for="timezone">Timezone</label>
      <select id="timezone" name="timezone" onchange={() => (saved = false)}>
        {#each data.timezones as tz (tz)}
          <option value={tz} selected={tz === data.settings.timezone}>{tz}</option>
        {/each}
      </select>
      <p class="hint">
        Decides when a new day starts. Changing it never touches your history; it only affects which
        date counts as today from now on.
      </p>

      <label for="sessionLength">Words per review session</label>
      <select id="sessionLength" name="sessionLength" onchange={() => (saved = false)}>
        {#each data.sessionLengths as n (n)}
          <option value={n} selected={n === data.settings.sessionLength}>{n} words</option>
        {/each}
      </select>

      <div class="row">
        <button class="btn" type="submit">Save</button>
        <span role="status">{form?.saveError ?? (saved ? 'Saved ✓' : '')}</span>
      </div>
    </form>
  </section>

  <section class="card pop-in" style="--i: 2">
    <h2>Look and feel</h2>
    <p class="hint">These are remembered on this device.</p>

    <fieldset>
      <legend>Theme</legend>
      {#each themes as [value, label] (value)}
        <label class="opt">
          <input
            type="radio"
            name="theme"
            {value}
            checked={theme === value}
            onchange={() => {
              theme = /** @type {typeof theme} */ (value)
              setTheme(theme)
            }}
          />
          {label}
        </label>
      {/each}
    </fieldset>

    <fieldset>
      <legend>Text size</legend>
      {#each sizes as [value, label] (value)}
        <label class="opt">
          <input
            type="radio"
            name="textSize"
            {value}
            checked={textSize === value}
            onchange={() => {
              textSize = /** @type {typeof textSize} */ (value)
              setTextSize(textSize)
            }}
          />
          {label}
        </label>
      {/each}
    </fieldset>

    <fieldset>
      <legend>Animation</legend>
      {#each motions as [value, label] (value)}
        <label class="opt">
          <input
            type="radio"
            name="motion"
            {value}
            checked={motion === value}
            onchange={() => {
              motion = /** @type {typeof motion} */ (value)
              setMotion(motion)
            }}
          />
          {label}
        </label>
      {/each}
    </fieldset>
  </section>

  <section class="card pop-in" style="--i: 3">
    <h2>Your data</h2>
    <p class="hint">
      The backup holds your progress, notes, favorites and settings. Words themselves come with the
      app.
    </p>
    <ul class="downloads">
      <li>
        <a
          class="btn"
          href={resolve('/export/[file]', { file: 'backup.json' })}
          data-sveltekit-reload
          download><Download size={18} aria-hidden="true" /> Download backup</a
        >
      </li>
      <li>
        <a href={resolve('/export/[file]', { file: 'wordbook.csv' })} data-sveltekit-reload download
          >Wordbook as CSV</a
        >
      </li>
      <li>
        <a
          href={resolve('/export/[file]', { file: 'wordbook.json' })}
          data-sveltekit-reload
          download>Wordbook as JSON</a
        >
      </li>
    </ul>

    <h3>Restore from a backup</h3>
    <form
      method="POST"
      action="?/restore"
      enctype="multipart/form-data"
      use:enhance={() => {
        restoring = true
        return async ({ update }) => {
          restoring = false
          await update({ reset: true })
        }
      }}
    >
      <label for="backup">Backup file</label>
      <input id="backup" name="backup" type="file" accept="application/json,.json" required />
      <label class="opt">
        <input type="checkbox" name="confirm" value="yes" required />
        I understand this replaces my current progress with the backup.
      </label>
      <div class="row">
        <button class="btn" type="submit" disabled={restoring}
          ><Upload size={18} aria-hidden="true" /> Restore</button
        >
        <span role="status">
          {#if form?.restoreError}{form.restoreError}
          {:else if form?.restored}Restored {form.restored.words} words, {form.restored.reviews} reviews,
            {form.restored.notes} notes ✓{#if form.restored.skippedUnknown}
              ({form.restored.skippedUnknown} entries for words this app does not have were skipped){/if}
          {/if}
        </span>
      </div>
    </form>
  </section>

  <section class="card pop-in" style="--i: 4">
    <h2>Account and content</h2>
    <p class="hint">
      The <a href={resolve('/admin')}>content admin</a> shows how many fresh words are left and any issues
      readers have flagged.
    </p>
    <form method="POST" action="?/logout">
      <button class="btn" type="submit"><LogOut size={18} aria-hidden="true" /> Sign out</button>
    </form>
  </section>
</div>

<style>
  .grid {
    display: grid;
    gap: var(--space-4);
    max-width: 44rem;
  }
  form {
    display: grid;
    gap: var(--space-2);
  }
  label,
  legend {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  select,
  input[type='file'] {
    font: inherit;
    padding: var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  fieldset {
    border: 0;
    margin: 0 0 var(--space-3);
    padding: 0;
    display: grid;
    gap: var(--space-1);
  }
  .opt {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-family: var(--font-body);
    font-weight: 400;
  }
  .opt input {
    width: 1.2rem;
    height: 1.2rem;
    accent-color: var(--grape);
  }
  .hint {
    margin: 0 0 var(--space-2);
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    text-decoration: none;
  }
  .downloads {
    list-style: none;
    margin: 0 0 var(--space-4);
    padding: 0;
    display: flex;
    gap: var(--space-4);
    align-items: center;
    flex-wrap: wrap;
  }
  h3 {
    font-size: 1.15rem;
    margin-top: var(--space-4);
  }
</style>
