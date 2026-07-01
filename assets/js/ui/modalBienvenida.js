import { Modal } from "bootstrap";

/**
 * Modal de bienvenida: explica las 3 actividades principales del visor
 * (gestión de la base catastral, reportes temáticos y backup) al entrar.
 */
export function inicializarModalBienvenida() {
  const elemento = document.getElementById("modalBienvenida");
  if (!elemento) return;

  const modal = Modal.getOrCreateInstance(elemento);
  modal.show();
}
