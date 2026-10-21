<script>
  import { RotateCw } from 'lucide-svelte'

  /** @type {{ front: import('svelte').Snippet, back: import('svelte').Snippet, accent?: string }} */
  let { front, back, accent = 'grape' } = $props()

  let flipped = $state(false)
</script>

<div class="flip" style="--accent: var(--{accent})">
  <div class="scene">
    <div class="card3d" class:flipped>
      <div class="face front" inert={flipped}>{@render front()}</div>
      <div class="face back" inert={!flipped}>{@render back()}</div>
    </div>
  </div>
  <button class="btn" type="button" aria-pressed={flipped} onclick={() => (flipped = !flipped)}>
    <RotateCw size={18} aria-hidden="true" />
    {flipped ? 'Show the word' : 'Flip for the meaning'}
  </button>
</div>

<style>
  .flip {
    display: grid;
    justify-items: center;
    gap: var(--space-4);
  }
  .scene {
    perspective: 1200px;
    width: 100%;
  }
  .card3d {
    display: grid;
    transform-style: preserve-3d;
    transition: transform var(--dur-slow) var(--ease-bounce);
  }
  .card3d.flipped {
    transform: rotateY(180deg);
  }
  .face {
    grid-area: 1 / 1;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    background: var(--surface);
    border: 2px solid var(--line);
    border-top: 12px solid var(--accent);
    border-radius: var(--radius-3);
    box-shadow: var(--shadow-2);
    padding: var(--space-6) var(--space-5);
    min-height: 15rem;
    display: grid;
    align-content: center;
    justify-items: center;
    text-align: center;
    gap: var(--space-2);
  }
  .back {
    transform: rotateY(180deg);
  }
</style>
