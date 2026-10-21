<script>
  import { onMount } from 'svelte'
  import { KeyRound, ShieldCheck } from 'lucide-svelte'
  import { saveKey, readKey, maskedKey, removeKey } from '#lib/ai/key-store.js'
  import { testConnection, ClaudeError, MODELS } from '#lib/ai/claude.js'
  import { getModel, setModel } from '#lib/ai/settings.js'

  /** @type {{ onchange?: (connected: boolean) => void }} */
  let { onchange } = $props()

  let mounted = $state(false)
  let masked = $state(/** @type {string | null} */ (null))
  let draft = $state('')
  let model = $state(getModel())
  let busy = $state(false)
  /** @type {{ kind: 'ok' | 'bad', text: string } | null} */
  let message = $state(null)

  onMount(() => {
    masked = maskedKey()
    model = getModel()
    mounted = true
  })

  function save() {
    const result = saveKey(draft)
    if (!result.ok) {
      message = { kind: 'bad', text: result.error }
      return
    }
    draft = ''
    masked = maskedKey()
    message = { kind: 'ok', text: 'Saved in this browser. Try the connection to be sure.' }
    onchange?.(true)
  }

  async function test() {
    busy = true
    message = null
    try {
      await testConnection({ apiKey: readKey(), model })
      message = { kind: 'ok', text: 'Connected. Claude answered.' }
    } catch (e) {
      const detail = e instanceof ClaudeError && e.detail ? ` (${e.detail})` : ''
      message = {
        kind: 'bad',
        text: (e instanceof ClaudeError ? e.message : 'Something went wrong.') + detail
      }
    } finally {
      busy = false
    }
  }

  function remove() {
    removeKey()
    masked = null
    message = { kind: 'ok', text: 'Removed. This browser no longer holds your key.' }
    onchange?.(false)
  }
</script>

<section class="panel card" aria-labelledby="claude-heading">
  <h2 id="claude-heading"><KeyRound size={22} aria-hidden="true" /> Claude connection</h2>

  {#if !mounted}
    <p class="meta">Checking this browser…</p>
  {:else if masked}
    <p>
      Connected with the key ending <strong aria-label="last four characters">{masked}</strong>.
    </p>
    <div class="field">
      <label for="model">Model</label>
      <select
        id="model"
        bind:value={model}
        onchange={() => {
          setModel(model)
          message = null
        }}
      >
        {#each MODELS as m (m.id)}
          <option value={m.id}>{m.label} · {m.note}</option>
        {/each}
      </select>
    </div>
    <div class="row">
      <button class="btn" type="button" onclick={test} disabled={busy}>
        {busy ? 'Testing…' : 'Test connection'}
      </button>
      <button class="btn ghost" type="button" onclick={remove} disabled={busy}>Remove key</button>
    </div>
  {:else}
    <p>
      Word Nuance asks Claude to write each exercise. Paste your own Claude API key to switch it on.
    </p>
    <form
      onsubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <label for="claude-key">Claude API key</label>
      <!-- No name attribute on purpose: nothing in this form can ever be sent to our server. -->
      <input
        id="claude-key"
        type="password"
        autocomplete="off"
        spellcheck="false"
        placeholder="sk-ant-…"
        bind:value={draft}
      />
      <div class="row">
        <button class="btn" type="submit">Save key</button>
      </div>
    </form>
  {/if}

  <p class="status" role="status" class:bad={message?.kind === 'bad'}>{message?.text ?? ''}</p>

  <div class="notes">
    <p>
      <ShieldCheck size={18} aria-hidden="true" />
      The key stays in this browser only. It goes straight to Anthropic and never to this app's server,
      its database or its backups.
    </p>
    <ul>
      <li>Create a separate key for this and set a small monthly spend limit on it.</li>
      <li>On a shared computer, remove the key when you finish.</li>
      <li>Anyone who can use this browser profile could read the key.</li>
    </ul>
  </div>
</section>

<style>
  .panel {
    display: grid;
    gap: var(--space-3);
  }
  h2 {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
  }
  p {
    margin: 0;
  }
  .meta {
    color: var(--ink-soft);
  }
  form,
  .field {
    display: grid;
    gap: var(--space-2);
    max-width: 32rem;
  }
  label {
    font-weight: 700;
  }
  input,
  select {
    font: inherit;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  .row {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .status {
    min-height: 1.5em;
    color: var(--ink);
    font-weight: 700;
  }
  .status.bad::before {
    content: '\26A0\FE0F  ';
  }
  .ghost {
    background: var(--surface);
    color: var(--ink);
  }
  .notes {
    border-top: 2px dashed var(--line);
    padding-top: var(--space-3);
    color: var(--ink-soft);
    font-size: 0.95rem;
  }
  .notes p {
    display: flex;
    gap: var(--space-2);
    align-items: flex-start;
  }
  .notes ul {
    margin: var(--space-2) 0 0;
    padding-left: 1.4rem;
  }
</style>
