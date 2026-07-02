import { Modal } from "bootstrap";

// Se guarda en el navegador (sin caducidad) para mostrar el modal una única
// vez; si cambia el contenido de bienvenida y se quiere volver a mostrarlo a
// todos, basta con subir esta versión.
const CLAVE_VISTO = "kaypacha_bienvenida_vista_v1";

/**
 * Modal de bienvenida: explica las 3 actividades principales del visor
 * (gestión de la base catastral, reportes temáticos y backup) al entrar.
 * Se muestra una sola vez por navegador.
 */
export function inicializarModalBienvenida() {
  const elemento = document.getElementById("modalBienvenida");
  if (!elemento) return;

  let yaVisto = false;
  try {
    yaVisto = localStorage.getItem(CLAVE_VISTO) === "1";
  } catch (error) {
    // Si el navegador bloquea localStorage (modo privado, permisos, etc.)
    // simplemente se muestra el modal en cada carga; no es un error crítico.
    console.warn("No se pudo leer localStorage:", error);
  }
  if (yaVisto) return;

  const modal = Modal.getOrCreateInstance(elemento);

  // El botón "Hacer un recorrido" cierra este modal y, una vez cerrado,
  // dispara el recorrido guiado reutilizando el botón del footer (evita
  // duplicar la lógica de recorridoGuiado.js).
  let iniciarRecorridoAlCerrar = false;
  document
    .getElementById("btnRecorridoDesdeBienvenida")
    ?.addEventListener("click", () => {
      iniciarRecorridoAlCerrar = true;
    });

  elemento.addEventListener(
    "hidden.bs.modal",
    () => {
      try {
        localStorage.setItem(CLAVE_VISTO, "1");
      } catch (error) {
        console.warn("No se pudo guardar en localStorage:", error);
      }
      if (iniciarRecorridoAlCerrar) {
        document.getElementById("btnRecorridoAyuda")?.click();
      }
    },
    { once: true },
  );

  modal.show();
}
