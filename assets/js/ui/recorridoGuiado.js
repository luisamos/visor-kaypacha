/**
 * Recorrido guiado (product tour) ligero y sin dependencias.
 *
 * Diseño escalable: los pasos se declaran como datos (array PASOS_RECORRIDO),
 * de modo que añadir, quitar o reordenar un paso no requiere tocar la lógica.
 * La presentación usa variables de Bootstrap (--bs-*), por lo que se adapta
 * automáticamente al modo claro/oscuro (data-bs-theme).
 *
 * Los pasos cuyo elemento no exista o no esté visible (p. ej. "Importar datos"
 * cuando el usuario no ha iniciado sesión) se omiten automáticamente.
 */

// Cada paso apunta a un selector existente en el DOM.
export const PASOS_RECORRIDO = [
  {
    selector: "#profileDropdown",
    titulo: "Autenticación",
    texto:
      "Inicia sesión aquí. Con tu cuenta se habilitan acciones como importar datos y configurar el sistema.",
  },
  {
    selector: ".theme-switcher-wrapper",
    titulo: "Modo claro u oscuro",
    texto:
      "Cambia entre tema claro y oscuro para trabajar cómodo en cualquier condición de luz.",
  },
  {
    selector: "#sidebarNav",
    titulo: "Catálogo y navegación",
    texto:
      "Aquí encuentras las capas y secciones del visor. Actívalas para mostrarlas en el mapa.",
  },
  {
    selector: "#left-button-group",
    titulo: "Vista y zoom",
    texto:
      "Controles del mapa: vista general (inicio), acercarse (+) y alejarse (−).",
  },
  {
    selector: "#btnCapaBase",
    titulo: "Capa base",
    texto:
      "Cambia el mapa de fondo (callejero, satélite, etc.) según lo que necesites visualizar.",
  },
  {
    selector: '[data-panel="panel2"]',
    titulo: "Importar datos geográficos",
    texto:
      "Sube tus shapefiles (.zip) para validarlos y cargarlos junto a las capas del catastro.",
  },
  {
    selector: '[data-panel="panel3"]',
    titulo: "Ubicar coordenadas",
    texto:
      "Escribe una coordenada para desplazar el mapa exactamente a ese punto.",
  },
  {
    selector: "#obtenerCoordenadas",
    titulo: "Obtener coordenadas",
    texto:
      "Activa esta herramienta y haz clic en el mapa para conocer las coordenadas de un punto.",
  },
  {
    selector: "#leyenda",
    titulo: "Leyenda",
    texto:
      "Muestra u oculta la leyenda para interpretar los símbolos y colores de las capas activas.",
  },
  {
    selector: "#btnMiniMapa",
    titulo: "Mini mapa",
    texto:
      "Abre un mapa de referencia para ubicarte dentro del territorio mientras navegas.",
  },
  {
    selector: '[data-panel="panelCalcular"]',
    titulo: "Medir distancia y área",
    texto:
      "Mide longitudes y superficies dibujando directamente sobre el mapa.",
  },
  {
    selector: "#btnGrillado",
    titulo: "Grillado UTM",
    texto:
      "Activa o desactiva la cuadrícula de coordenadas UTM sobre el mapa.",
  },
  {
    selector: '[data-panel="panelImprimir"]',
    titulo: "Exportar / imprimir mapa",
    texto:
      "Genera una imagen del mapa actual con título y logo para imprimir o compartir.",
  },
  {
    selector: "#btnRecorridoAyuda",
    titulo: "Repite el recorrido cuando quieras",
    texto:
      "Puedes volver a iniciar esta ayuda en cualquier momento desde este botón del pie de página.",
  },
];

const MARGEN = 12; // separación entre el resaltado y el popover
const ANCHO_MOVIL = 768; // px: por debajo, el popover se ancla abajo

/** Indica si un elemento está presente y visible (ocupa espacio en pantalla). */
function esVisible(el) {
  if (!el) return false;
  if (el.offsetParent === null && getComputedStyle(el).position !== "fixed") {
    return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

class RecorridoGuiado {
  constructor(pasos) {
    this.pasos = Array.isArray(pasos) ? pasos : [];
    this.indice = 0;
    this.pasosVisibles = [];
    this._overlay = null;
    this._highlight = null;
    this._popover = null;
    this._onResize = () => this._posicionar();
    this._onKey = (e) => this._teclado(e);
  }

  iniciar() {
    // Solo pasos cuyo elemento existe y está visible en este momento.
    this.pasosVisibles = this.pasos.filter((p) =>
      esVisible(document.querySelector(p.selector)),
    );
    if (!this.pasosVisibles.length) return;

    this.indice = 0;
    this._construirDom();
    window.addEventListener("resize", this._onResize);
    window.addEventListener("scroll", this._onResize, true);
    document.addEventListener("keydown", this._onKey);
    this._render();
  }

  finalizar() {
    window.removeEventListener("resize", this._onResize);
    window.removeEventListener("scroll", this._onResize, true);
    document.removeEventListener("keydown", this._onKey);
    [this._overlay, this._highlight, this._popover].forEach((el) => el?.remove());
    this._overlay = this._highlight = this._popover = null;
  }

  siguiente() {
    if (this.indice < this.pasosVisibles.length - 1) {
      this.indice += 1;
      this._render();
    } else {
      this.finalizar();
    }
  }

  anterior() {
    if (this.indice > 0) {
      this.indice -= 1;
      this._render();
    }
  }

  // -- interno ---------------------------------------------------------------

  _construirDom() {
    // Capa que atenúa e impide interactuar con la página durante el recorrido.
    // No se cierra al hacer clic: solo se sale con la ✕ o la tecla Esc.
    this._overlay = document.createElement("div");
    this._overlay.className = "tour-overlay";

    this._highlight = document.createElement("div");
    this._highlight.className = "tour-highlight";

    this._popover = document.createElement("div");
    this._popover.className = "tour-popover";

    document.body.append(this._overlay, this._highlight, this._popover);
  }

  _teclado(e) {
    if (e.key === "Escape") this.finalizar();
    else if (e.key === "ArrowRight") this.siguiente();
    else if (e.key === "ArrowLeft") this.anterior();
  }

  _render() {
    const paso = this.pasosVisibles[this.indice];
    const objetivo = document.querySelector(paso.selector);
    if (!esVisible(objetivo)) {
      // El elemento desapareció: continúa con el siguiente paso válido.
      this.siguiente();
      return;
    }

    objetivo.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });

    const esUltimo = this.indice === this.pasosVisibles.length - 1;
    const esPrimero = this.indice === 0;

    this._popover.innerHTML = `
      <button type="button" class="tour-popover__close" aria-label="Salir del recorrido">&times;</button>
      <div class="tour-popover__title">${paso.titulo}</div>
      <div class="tour-popover__body">${paso.texto}</div>
      <div class="tour-popover__footer">
        <span class="tour-popover__progress">${this.indice + 1} de ${this.pasosVisibles.length}</span>
        <div class="tour-popover__actions">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-tour="atras" ${
            esPrimero ? "disabled" : ""
          }>Atrás</button>
          <button type="button" class="btn btn-sm btn-primary" data-tour="siguiente">${
            esUltimo ? "Listo" : "Siguiente"
          }</button>
        </div>
      </div>`;

    this._popover.querySelector(".tour-popover__close").onclick = () => this.finalizar();
    this._popover.querySelector('[data-tour="atras"]').onclick = () => this.anterior();
    this._popover.querySelector('[data-tour="siguiente"]').onclick = () => this.siguiente();

    // Posiciona tras pintar para tener medidas correctas.
    requestAnimationFrame(() => this._posicionar());
  }

  _posicionar() {
    const paso = this.pasosVisibles[this.indice];
    const objetivo = paso && document.querySelector(paso.selector);
    if (!objetivo || !this._highlight) return;

    const r = objetivo.getBoundingClientRect();

    // Resaltado sobre el elemento.
    Object.assign(this._highlight.style, {
      top: `${r.top - 4}px`,
      left: `${r.left - 4}px`,
      width: `${r.width + 8}px`,
      height: `${r.height + 8}px`,
    });

    const pop = this._popover.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // En pantallas pequeñas el popover se ancla al centro inferior, evitando
    // que quede fuera de la vista con objetivos grandes (p. ej. el catálogo).
    if (vw <= ANCHO_MOVIL) {
      const left = Math.max(MARGEN, (vw - pop.width) / 2);
      const top = Math.max(MARGEN, vh - pop.height - MARGEN);
      this._popover.style.left = `${left}px`;
      this._popover.style.top = `${top}px`;
      return;
    }

    // En escritorio: debajo del objetivo o encima si no cabe.
    let top = r.bottom + MARGEN;
    if (top + pop.height > vh) top = r.top - pop.height - MARGEN;
    if (top < MARGEN) top = MARGEN;

    let left = r.left + r.width / 2 - pop.width / 2;
    left = Math.max(MARGEN, Math.min(left, vw - pop.width - MARGEN));

    this._popover.style.top = `${top}px`;
    this._popover.style.left = `${left}px`;
  }
}

/**
 * Conecta el botón "Ayuda hacer un recorrido" del footer con el recorrido.
 * Llamar una sola vez al iniciar la app.
 */
export function inicializarRecorrido(pasos = PASOS_RECORRIDO) {
  const boton = document.getElementById("btnRecorridoAyuda");
  if (!boton) return;
  boton.addEventListener("click", () => new RecorridoGuiado(pasos).iniciar());
}

export default RecorridoGuiado;
