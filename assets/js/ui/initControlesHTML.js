/**
 * initControlesHTML.js
 * Inyecta dinámicamente los elementos HTML de los nuevos controles:
 *   1. Imagen Norte (esquina superior izquierda del mapa)
 *   2. Panel Mini Mapa
 *   3. Panel Calcular (medir distancia / área)
 *   4. Panel Imprimir (exportar mapa a PNG)
 *   5. Botones en barra derecha (mini mapa, medir, imprimir)
 */

function insertarBotoNorte() {
  const mapDiv = document.getElementById('map');
  if (!mapDiv) return;

  const container = document.createElement('div');
  container.id = 'norte-container';
  container.className = 'norte-container';
  container.innerHTML = `
    <div id="btnNorte" class="norte-imagen" title="Orientar al norte">
      <img src="./assets/images/norte.svg" alt="Norte" draggable="false" />
    </div>
  `;

  mapDiv.insertAdjacentElement('afterend', container);
}

function insertarPanelMiniMapa() {
  const panelReporte = document.getElementById('reporte-servicios-panel');
  if (!panelReporte) return;

  const section = document.createElement('section');
  section.id = 'minimapa-panel';
  section.className = 'minimapa-panel d-none';
  section.innerHTML = `
    <div class="minimapa-head">
      <h6 class="mb-0">Mini mapa</h6>
      <button
        type="button"
        id="minimapa-cerrar"
        class="btn-close btn-close-panel"
        aria-label="Cerrar"
      ></button>
    </div>
    <div class="minimapa-body">
      <div id="minimapa-map"></div>
    </div>
  `;

  panelReporte.insertAdjacentElement('afterend', section);
}

function insertarPanelCalcular() {
  const pageContent = document.querySelector('.page-content');
  if (!pageContent) return;

  const panel = document.createElement('div');
  panel.id = 'panelCalcular';
  panel.className = 'side-panel card';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="panel-header card-header d-flex justify-content-between align-items-center py-2 px-3">
      <p class="mb-0 fw-semibold">Medir distancia / área</p>
      <button class="btn-close" data-close="panelCalcular" aria-label="Cerrar"></button>
    </div>
    <div class="card-body p-3">
      <p class="text-uppercase fw-semibold mb-2 panel-section-label">Tipo de medición</p>
      <div class="d-flex gap-2 mb-3">
        <button id="btnCalcularPerimetro" class="btn btn-outline-primary btn-sm flex-fill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-sm"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>Distancia
        </button>
        <button id="btnCalcularArea" class="btn btn-outline-secondary btn-sm flex-fill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-sm"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>Área
        </button>
      </div>
      <div class="text-muted mb-3 panel-status-text" id="calcularEstado">&#x2014;<br>Elige un tipo de medición</div>
      <hr class="my-2" />
      <button id="btnBorrarCalculo" class="btn btn-outline-danger btn-sm w-100">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-sm"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>Limpiar medición
      </button>
    </div>
  `;

  pageContent.appendChild(panel);
}

function insertarPanelImprimir() {
  const pageContent = document.querySelector('.page-content');
  if (!pageContent) return;

  const panel = document.createElement('div');
  panel.id = 'panelImprimir';
  panel.className = 'side-panel card';
  panel.style.display = 'none';
  panel.innerHTML = `
    <div class="panel-header card-header d-flex justify-content-between align-items-center py-2 px-3">
      <p class="mb-0 fw-semibold">Exportar mapa</p>
      <button class="btn-close" data-close="panelImprimir" aria-label="Cerrar"></button>
    </div>
    <div class="card-body p-3">
      <div class="mb-3">
        <label for="imprimirTitulo" class="col-form-label-sm fw-semibold">Título del mapa:</label>
        <input type="text" class="form-control form-control-sm" id="imprimirTitulo" placeholder="Ingresa un título..." maxlength="120">
      </div>
      <div class="mb-3 form-check">
        <input type="checkbox" class="form-check-input" id="imprimirConLogo" checked>
        <label class="form-check-label" for="imprimirConLogo">Incluir logo</label>
      </div>
      <hr class="my-2" />
      <button id="btnExportarPNG" class="btn btn-primary btn-sm w-100">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon-sm"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Exportar a PNG
      </button>
    </div>
  `;

  pageContent.appendChild(panel);
}

function insertarBotonesBarraDerecha() {
  const buttonGroup = document.getElementById('button-group');
  if (!buttonGroup) return;

  const html = `
    <div class="button-group-sep"></div>

    <button
      id="btnMiniMapa"
      class="btn btn-secondary"
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      data-bs-title="Mini mapa"
    >
      <i data-feather="map" class="icon-sm"></i>
    </button>

    <div class="button-group-sep"></div>

    <button
      data-panel="panelCalcular"
      class="btn btn-secondary"
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      data-bs-title="Medir distancia / área"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="6" x2="6" y2="12"/><line x1="10" y1="6" x2="10" y2="18"/><line x1="14" y1="6" x2="14" y2="12"/><line x1="18" y1="6" x2="18" y2="12"/></svg>
    </button>

    <div class="button-group-sep"></div>

    <button
      data-panel="panelImprimir"
      class="btn btn-secondary"
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      data-bs-title="Exportar mapa"
    >
      <i data-feather="printer" class="icon-sm"></i>
    </button>

    <div class="button-group-sep"></div>

    <button
      id="btnGrillado"
      class="btn btn-secondary"
      data-bs-toggle="tooltip"
      data-bs-placement="left"
      data-bs-title="Grillado UTM"
    >
      <i data-feather="grid" class="icon-sm"></i>
    </button>
  `;

  buttonGroup.insertAdjacentHTML('beforeend', html);
}

// ── Ejecutar antes de que el resto de módulos registren sus listeners ────────
insertarBotoNorte();
insertarPanelMiniMapa();
insertarPanelCalcular();
insertarPanelImprimir();
insertarBotonesBarraDerecha();

// Re-renderizar iconos feather sobre los elementos recién insertados
import feather from 'feather-icons';
feather.replace();
