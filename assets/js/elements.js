/**
 * Centralizes DOM element lookups and warns at load time if an expected
 * element is missing, making configuration errors easy to spot.
 *
 * Usage:
 *   import { el } from './elements';
 *   const btn = el('myButtonId');   // returns HTMLElement | null, logs a warning if absent
 */
export function el(id) {
  const elem = document.getElementById(id);
  if (!elem) {
    console.warn(`[elements] #${id} not found in the DOM`);
  }
  return elem;
}
