<script>
  import { enhance } from '$app/forms'

  let sent = $state(false)
</script>

<details>
  <summary>Report an issue with this entry</summary>
  <form
    method="POST"
    action="?/report"
    use:enhance={() =>
      async ({ result, formElement }) => {
        if (result.type === 'success') {
          sent = true
          formElement.reset()
        }
      }}
  >
    <label for="field">Which part?</label>
    <select id="field" name="field">
      <option value="definition">Definition</option>
      <option value="pronunciation">Pronunciation</option>
      <option value="etymology">Word history</option>
      <option value="examples">Examples</option>
      <option value="synonyms">Synonyms</option>
      <option value="sources">Sources</option>
      <option value="other">Something else</option>
    </select>
    <label for="comment">What looks wrong or unclear? <span class="hint">(optional)</span></label>
    <textarea id="comment" name="comment" rows="3" maxlength="1000" oninput={() => (sent = false)}
    ></textarea>
    <div class="row">
      <button class="btn" type="submit">Send report</button>
      <span role="status">{sent ? 'Thank you, noted ✓' : ''}</span>
    </div>
  </form>
</details>

<style>
  summary {
    cursor: pointer;
    font-family: var(--font-ui);
    font-weight: 500;
  }
  form {
    display: grid;
    gap: var(--space-2);
    margin-top: var(--space-3);
    max-width: 32rem;
  }
  label {
    font-weight: 700;
  }
  .hint {
    font-weight: 400;
    color: var(--ink-soft);
  }
  select,
  textarea {
    font: inherit;
    padding: var(--space-2) var(--space-3);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-4);
  }
</style>
