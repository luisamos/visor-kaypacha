/**
 * Recorrido guiado (product tour) ligero y sin dependencias.
 *
 * Diseño escalable: los pasos se declaran como datos (array PASOS_RECORRIDO),
 * de modo que añadir, quitar o reordenar un paso no requiere tocar la lógica.
 * La presentación usa variables de Bootstrap (--bs-*), por lo que se adapta
 * automáticamente al modo claro/oscuro (data-bs-theme).
 */

// Cada paso apunta a un selector existente en el DOM. Si el elemento no está
// presente (p. ej. una herramienta oculta), el paso se omite con elegancia.
export const PASOS_RECORRIDO = [
  {
    selector: "#sidebarNav",
    titulo: "Catálogo y navegación",
    texto:
      "Aquí encuentras las capas y secciones del visor. Actívalas para mostrarlas en el mapa.",
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
    selector: "#theme-switcher",
    titulo: "Modo claro u oscuro",
    texto:
      "Cambia entre tema claro y oscuro para trabajar cómodo en cualquier condición de luz.",
  },
  {
    selector: "#btnRecorridoAyuda",
    titulo: "Repite el recorrido cuando quieras",
    texto:
      "Puedes volver a iniciar esta ayuda en cualquier momento desde este botón del pie de página.",
  },
];

const MARGEN = 12; // separación entre el resaltado y el popover

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
    // Filtra a los pasos cuyo elemento existe en este momento.
    this.pasosVisibles = this.pasos.filter((p) =>
      document.querySelector(p.selector),
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
    this._overlay = document.createElement("div");
    this._overlay.className = "tour-overlay";
    this._overlay.addEventListener("click", () => this.finalizar());

    this._highlight = document.createElement("div");
    this._highlight.className = "tour-highlight";

    this._popover = document.createElement("div");
    this._popover.className = "tour-popover";
    // Evita que el clic dentro del popover cierre el recorrido.
    this._popover.addEventListener("click", (e) => e.stopPropagation());

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
    if (!objetivo) {
      // El elemento desapareció: continúa con el siguiente paso válido.
      this.siguiente();
      return;
    }

    objetivo.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });

    const esUltimo = this.indice === this.pasosVisibles.length - 1;
    const esPrimero = this.indice === 0;

    this._popover.innerHTML = `
      <button type="button" class="tour-popover__close" aria-label="Cerrar">&times;</button>
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

    // Coloca el popover en el lado con más espacio disponible.
    const pop = this._popover.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

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
