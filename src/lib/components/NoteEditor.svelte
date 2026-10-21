<script>
  import { enhance } from '$app/forms'
  import { Heart } from 'lucide-svelte'

  /** @type {{ note: { text: string, favorite: boolean, tags: string } }} */
  let { note } = $props()

  // svelte-ignore state_referenced_locally
  let favorite = $state(note.favorite)
  let saved = $state(false)
</script>

<div class="editor">
  <form
    method="POST"
    action="?/favorite"
    use:enhance={() =>
      async ({ result }) => {
        if (result.type === 'success') favorite = !favorite
      }}
  >
    <input type="hidden" name="favorite" value={favorite ? '0' : '1'} />
    <button class="fav" type="submit" aria-pressed={favorite}>
      <Heart size={20} aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />
      {favorite ? 'Favorite' : 'Add to favorites'}
    </button>
  </form>

  <form
    method="POST"
    action="?/note"
    use:enhance={() =>
      async ({ result }) => {
        saved = result.type === 'success'
      }}
  >
    <label for="note">Your note</label>
    <textarea
      id="note"
      name="note"
      rows="4"
      maxlength="4000"
      oninput={() => (saved = false)}
      placeholder="A sentence of your own, where you met the word, anything that helps it stick."
      >{note.text}</textarea
    >
    <label for="tags">Tags <span class="hint">(comma separated)</span></label>
    <input
      id="tags"
      name="tags"
      value={note.tags}
      maxlength="200"
      oninput={() => (saved = false)}
    />
    <div class="row">
      <button class="btn" type="submit">Save note</button>
      <span class="status" role="status">{saved ? 'Saved ✓' : ''}</span>
    </div>
  </form>
</div>

<style>
  .editor {
    display: grid;
    gap: var(--space-4);
  }
  form {
    display: grid;
    gap: var(--space-2);
  }
  label {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .hint {
    font-weight: 400;
    color: var(--ink-soft);
  }
  textarea,
  input:not([type='hidden']) {
    font: inherit;
    padding: var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  textarea {
    font-family: var(--font-hand);
    font-size: 1.4rem;
    line-height: 1.3;
    resize: vertical;
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
  .status {
    font-weight: 700;
  }
  .fav {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font: inherit;
    font-family: var(--font-ui);
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-pill);
    border: 2px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease-bounce);
  }
  .fav:hover {
    transform: scale(1.05);
  }
  .fav[aria-pressed='true'] {
    border-color: var(--coral);
  }
  .fav[aria-pressed='true'] :global(svg) {
    color: var(--coral);
  }
</style>
