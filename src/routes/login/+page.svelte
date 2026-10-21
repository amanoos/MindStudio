<script>
  import { enhance } from '$app/forms'
  import Mascot from '#lib/components/Mascot.svelte'

  let { form } = $props()
</script>

<svelte:head><title>Sign in · Mind Studio</title></svelte:head>

<section class="login pop-in">
  <Mascot size={130} mood={form?.error ? 'sleep' : 'happy'} />
  <h1>Who goes there?</h1>
  <p>Professor Hoot guards your word collection. Enter your passcode to come in.</p>

  <form method="POST" use:enhance>
    <label for="passcode">Passcode</label>
    <input id="passcode" name="passcode" type="password" autocomplete="current-password" required />
    <p class="error" role="alert">{form?.error ?? ''}</p>
    <button class="btn" type="submit">Let me in</button>
  </form>
</section>

<style>
  .login {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: var(--space-3);
    max-width: 26rem;
    margin: var(--space-6) auto 0;
  }
  form {
    display: grid;
    gap: var(--space-2);
    width: 100%;
    text-align: left;
  }
  label {
    font-family: var(--font-ui);
    font-weight: 600;
  }
  input {
    font: inherit;
    padding: var(--space-3) var(--space-4);
    border: 2px solid var(--line);
    border-radius: var(--radius-1);
    background: var(--surface);
    color: var(--ink);
  }
  .error {
    min-height: 1.5em;
    margin: 0;
    color: var(--ink);
    font-weight: 700;
  }
</style>
