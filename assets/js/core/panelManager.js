/**
 * panelManager.js — Gestor centralizado de visibilidad de paneles.
 *
 * Problema que resuelve:
 *   El proyecto tenía tres patrones distintos para mostrar/ocultar paneles:
 *   1. barraControles.js  → panel.style.display = "block" / "none"
 *   2. controlMiniMapa.js → classList.remove/add("d-none")
 *   3. controlCapas.js    → classList.remove/add("d-none")
 *   Esta inconsistencia hacía difícil razonar sobre el estado de la UI.
 *
 * Patrón único adoptado: clase CSS "d-none" de Bootstrap.
 *   - mostrarPanel → classList.remove("d-none") + limpia display inline
 *   - ocultarPanel → classList.add("d-none")    + limpia display inline
 *
 * Paneles exclusivos: al mostrar uno se ocultan todos los del mismo grupo.
 * Útil para los paneles laterales (.side-panel) donde solo uno puede estar
 * abierto a la vez.
 *
 * Uso:
 *   import { registrarPanel, mostrarPanel, ocultarPanel, togglePanel } from "./panelManager";
 *
 *   registrarPanel("panelCalcular", { exclusivo: true,  botonId: "btnCalcular" });
 *   registrarPanel("minimapa-panel", { exclusivo: false, botonId: "btnMiniMapa" });
 *
 *   mostrarPanel("panelCalcular");   // oculta otros exclusivos
 *   ocultarPanel("minimapa-panel");
 *   togglePanel("panelCalcular");
 */

/** @type {Map<string, { el: HTMLElement, exclusivo: boolean, botonId?: string }>} */
const _paneles = new Map();

function _sincronizarBoton(id, visible) {
  const entry = _paneles.get(id);
  if (!entry?.botonId) return;
  const btn = document.getElementById(entry.botonId);
  if (!btn) return;
  btn.classList.toggle("active", visible);
}

/**
 * Registra un panel para que el manager lo controle.
 * @param {string} id       — id del elemento HTML del panel
 * @param {{ exclusivo?: boolean, botonId?: string }} opciones
 *   exclusivo: si true, mostrar este panel oculta todos los exclusivos del grupo
 *   botonId:   id del botón que activa el panel (se sincroniza su clase "active")
 */
export function registrarPanel(id, { exclusivo = false, botonId = null } = {}) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`panelManager: no se encontró el elemento #${id}`);
    return;
  }
  _paneles.set(id, { el, exclusivo, botonId });
}

export function mostrarPanel(id) {
  const entry = _paneles.get(id);
  if (!entry) return;

  if (entry.exclusivo) {
    _paneles.forEach((other, otherId) => {
      if (otherId !== id && other.exclusivo) _ocultarSinBoton(otherId);
    });
  }

  entry.el.classList.remove("d-none");
  entry.el.style.removeProperty("display");
  _sincronizarBoton(id, true);
}

export function ocultarPanel(id) {
  _ocultarSinBoton(id);
  _sincronizarBoton(id, false);
}

function _ocultarSinBoton(id) {
  const entry = _paneles.get(id);
  if (!entry) return;
  entry.el.classList.add("d-none");
  entry.el.style.removeProperty("display");
}

export function togglePanel(id) {
  const entry = _paneles.get(id);
  if (!entry) return;
  const oculto =
    entry.el.classList.contains("d-none") ||
    entry.el.style.display === "none";
  if (oculto) mostrarPanel(id);
  else ocultarPanel(id);
}

export function esPanelVisible(id) {
  const entry = _paneles.get(id);
  if (!entry) return false;
  return (
    !entry.el.classList.contains("d-none") &&
    entry.el.style.display !== "none"
  );
}
