/**
 * herramientas.js — Gestor centralizado de herramientas activas del visor.
 *
 * Problema que resuelve:
 *   Antes, cada módulo escribía en global.herramientaActiva y almacenaba
 *   funciones de desactivación en global.desactivar*. Esto creaba acoplamiento
 *   implícito: si un módulo olvidaba limpiar el estado, otro heredaba un valor
 *   incorrecto sin ninguna advertencia.
 *
 * Uso:
 *   // En el módulo de la herramienta:
 *   import { activarHerramienta, registrarDesactivador } from "./herramientas";
 *   registrarDesactivador("miHerramienta", () => { ... limpiar estado ... });
 *   activarHerramienta("miHerramienta");
 *
 *   // En main.js o quien necesite consultar:
 *   import { obtenerHerramientaActiva } from "./herramientas";
 *   if (obtenerHerramientaActiva() === "coordenadas") { ... }
 */

const _desactivadores = new Map(); // id → función de desactivación
let _herramientaActual = null;

/**
 * Registra la función que se debe llamar cuando la herramienta pierda el foco.
 * Llamar varias veces con el mismo id reemplaza el desactivador anterior.
 */
export function registrarDesactivador(id, fn) {
  if (typeof fn !== "function") return;
  _desactivadores.set(id, fn);
}

/**
 * Activa una herramienta. Si ya había otra activa, la desactiva primero.
 */
export function activarHerramienta(id) {
  if (_herramientaActual && _herramientaActual !== id) {
    const desactivar = _desactivadores.get(_herramientaActual);
    if (typeof desactivar === "function") desactivar();
  }
  _herramientaActual = id;
}

/**
 * Desactiva la herramienta indicada (solo si es la actual).
 * Llama a su desactivador registrado.
 */
export function desactivarHerramienta(id) {
  if (_herramientaActual !== id) return;
  const desactivar = _desactivadores.get(id);
  if (typeof desactivar === "function") desactivar();
  _herramientaActual = null;
}

/**
 * Devuelve el id de la herramienta activa, o null si ninguna lo está.
 */
export function obtenerHerramientaActiva() {
  return _herramientaActual;
}
