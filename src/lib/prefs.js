/**
 * Appearance preferences. They belong to the device (screen size, eyesight, the OS motion
 * setting), so they live in localStorage and are applied before first paint by the inline script
 * in app.html, then kept in sync here when the learner changes them.
 */

export const TEXT_SIZES = /** @type {const} */ ({
  small: 0.9,
  normal: 1,
  large: 1.15,
  xlarge: 1.3
})

/** @typedef {'system' | 'light' | 'dark'} ThemePref */
/** @typedef {'system' | 'reduce' | 'full'} MotionPref */
/** @typedef {keyof typeof TEXT_SIZES} TextSizePref */

/** @param {string} key */
function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** @param {string} key @param {string | null} value */
function write(key, value) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: the preference lasts until the page closes */
  }
}

export function readPrefs() {
  const theme = read('theme')
  const motion = read('motion')
  const size = read('textSize')
  return {
    theme: /** @type {ThemePref} */ (theme === 'light' || theme === 'dark' ? theme : 'system'),
    motion: /** @type {MotionPref} */ (
      motion === 'reduce' || motion === 'full' ? motion : 'system'
    ),
    textSize: /** @type {TextSizePref} */ (size && size in TEXT_SIZES ? size : 'normal')
  }
}

/** @param {ThemePref} theme */
export function setTheme(theme) {
  write('theme', theme === 'system' ? null : theme)
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
}

/** @param {MotionPref} motion */
export function setMotion(motion) {
  write('motion', motion === 'system' ? null : motion)
  const root = document.documentElement
  if (motion === 'system') delete root.dataset.motion
  else root.dataset.motion = motion
}

/** @param {TextSizePref} size */
export function setTextSize(size) {
  write('textSize', size === 'normal' ? null : size)
  document.documentElement.style.setProperty('--text-scale', String(TEXT_SIZES[size]))
}
