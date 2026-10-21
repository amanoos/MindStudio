<script>
  /** @type {{ fire: boolean }} */
  let { fire } = $props()

  function motionAllowed() {
    const root = document.documentElement
    if (root.dataset.motion === 'reduce') return false
    if (root.dataset.motion === 'full') return true
    return !matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  $effect(() => {
    if (!fire || !motionAllowed()) return
    let cancelled = false
    import('canvas-confetti').then(({ default: confetti }) => {
      if (cancelled) return
      const colors = ['#8b5cf6', '#fbbf24', '#fb7185', '#34d399', '#38bdf8']
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors,
        disableForReducedMotion: true
      })
      setTimeout(
        () =>
          confetti({ particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors }),
        250
      )
      setTimeout(
        () =>
          confetti({ particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors }),
        400
      )
    })
    return () => {
      cancelled = true
    }
  })
</script>
