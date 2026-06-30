import * as bootstrap from "bootstrap";
import {
  registrarPanel,
  mostrarPanel,
  ocultarPanel,
} from "../core/panelManager";

// Registrar paneles laterales como exclusivos (solo uno visible a la vez).
// El botonId sincroniza la clase "active" del botón al mostrar/ocultar.
document.querySelectorAll(".side-panel").forEach((panel) => {
  if (!panel.id) return;
  const boton = document.querySelector(`[data-panel="${panel.id}"]`);
  registrarPanel(panel.id, {
    exclusivo: true,
    botonId: boton?.id ?? null,
  });
});

let tooltipList;

document.querySelectorAll("[data-panel]").forEach((button) => {
  button.addEventListener("click", () => {
    const panelId = button.getAttribute("data-panel");
    mostrarPanel(panelId);
    OcultarTooltips();
  });
});

document.querySelectorAll(".btn-close[data-close]").forEach((button) => {
  button.addEventListener("click", (event) => {
    const panelId = event.target.getAttribute("data-close");
    if (panelId) ocultarPanel(panelId);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const tooltipTriggerList = document.querySelectorAll(
    '[data-bs-toggle="tooltip"]'
  );
  tooltipList = [...tooltipTriggerList].map(
    (tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
  );
});

function OcultarTooltips() {
  tooltipList.forEach((tooltip) => tooltip.hide());
}
