import {
  colores,
  direccionServicioWMS,
  direccionServicioWFS,
  direccionApiGIS,
  proyeccion3857,
  formatoGeoJson,
  formatoTexto,
  fechaHoy,
  buscarCapaId,
  ubigeo,
  mostrarToast,
  construirHeadersConCsrf,
  fichaIndividual,
  rutaFotografia,
  proyeccion4326,
  reportesConfig,
  COLOR_SIN_SERVICIO,
  CAPAS_BASE,
  DEFINICION_GRUPOS_WMS,
  CONFIG_BUSQUEDA_VIA_HAB,
} from "./configuracion";
import { registrarCapaWmsDinamica } from "./capasGeograficas";
import ApexCharts from "apexcharts";
import feather from "feather-icons";

import { Modal, Tooltip } from "bootstrap";
import ImageWMS from "ol/source/ImageWMS";
import GeoJSON from "ol/format/GeoJSON";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { Style, Stroke, Fill } from "ol/style";

function crearEstiloAchurado() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "rgba(255,0,0,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.lineTo(8, 0);
  ctx.moveTo(-2, 2);
  ctx.lineTo(2, -2);
  ctx.moveTo(6, 10);
  ctx.lineTo(10, 6);
  ctx.stroke();
  return new Style({
    stroke: new Stroke({ color: "red", width: 2 }),
    fill: new Fill({ color: ctx.createPattern(canvas, "repeat") }),
  });
}

const legendDiv = document.getElementById("legenda"),
  legendButton = document.getElementById("leyenda"),
  legendButtonLabel = legendButton?.querySelector(".legend-label"),
  sidebarNav = document.getElementById("sidebarNav"),
  mensajeBuscarLote = document.getElementById("mensajeBuscarLote"),
  btnBuscarPorIdLote = document.getElementById("btnBuscarPorIdLote"),
  mensajeBuscarViaHab = document.getElementById("mensajeBuscarViaHab"),
  buscarViaHab = document.getElementById("buscarViaHab"),
  estilo = crearEstiloAchurado(),
  contenido = document.getElementById("popup-content"),
  detalleLotePanel = document.getElementById("detalle-lote-panel"),
  detalleLoteBody = document.getElementById("detalle-lote-body"),
  detalleLoteCerrar = document.getElementById("detalle-lote-cerrar"),
  listadoLotePanel = document.getElementById("listado-lote-panel"),
  listadoLoteBody = document.getElementById("listado-lote-body"),
  listadoLoteCerrar = document.getElementById("listado-lote-cerrar"),
  listadoViasPanel = document.getElementById("listado-vias-panel"),
  listadoViasBody = document.getElementById("listado-vias-body"),
  listadoViasCerrar = document.getElementById("listado-vias-cerrar"),
  //popupCloser = document.getElementById("popup-closer"),
  fotoLotePanel = document.getElementById("foto-lote-panel"),
  fotoLoteImg = document.getElementById("foto-lote-img"),
  fotoLoteCerrar = document.getElementById("foto-lote-cerrar"),
  reporteServiciosPanel = document.getElementById("reporte-servicios-panel"),
  reporteServiciosBody = document.getElementById("reporte-servicios-body"),
  reporteServiciosCerrar = document.getElementById("reporte-servicios-cerrar"),
  popupTitle = document.querySelector("#popup .popup-title");

const legendTooltip = legendButton
  ? Tooltip.getOrCreateInstance(legendButton)
  : null;

const busquedaLoteModal = document.getElementById("busquedaLote"),
  busquedaViaHabModal = document.getElementById("busquedaViaHab"),
  busquedaViaHabTitulo = document.getElementById("busquedaViaHabTitulo"),
  busquedaViaHabEtiqueta = document.getElementById("busquedaViaHabEtiqueta"),
  valorViaHabInput = document.getElementById("valorViaHab"),
  busquedaLoteAuth = document.getElementById("busquedaLoteAuth"),
  listadoLoteHead = document.getElementById("listado-lote-head"),
  buscarPorDocInput = document.getElementById("buscarPorDocInput"),
  btnBuscarPorDoc = document.getElementById("btnBuscarPorDoc"),
  msgBuscarPorDoc = document.getElementById("msgBuscarPorDoc"),
  buscarPorTitularInput = document.getElementById("buscarPorTitularInput"),
  btnBuscarPorTitular = document.getElementById("btnBuscarPorTitular"),
  msgBuscarPorTitular = document.getElementById("msgBuscarPorTitular");

let capaBusqueda = null,
  lotesBusquedaActual = [],
  viasBusquedaActual = [],
  graficasReporte = [];

// Estado de filtros por reporte — derivado de reportesConfig
const estadosFiltroReporte = Object.fromEntries(
  reportesConfig.map((cfg) => [
    cfg.id,
    Object.fromEntries(cfg.campos.map((c) => [c.key, c.estadoInicial ?? 1])),
  ]),
);

// Caché de datos WFS por reporte
const cacheReporteData = {};

let tipoBusquedaViaHabActual = "habilitacion_urbana";


function slugify(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token, i) =>
      i === 0
        ? token.toLowerCase()
        : token.charAt(0).toUpperCase() + token.slice(1).toLowerCase(),
    )
    .join("");
}

function tituloCapaDesdeNombre(nombre = "") {
  return nombre
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function idUiDesdeNombreWms(nombreWms = "") {
  const map = {
    habilitacion_urbana: "habilitacionUrbana",
    eje_via: "ejeVia",
    servicio_basico: "servicioBasico",
    clasificacion_predio: "clasificacionPredio",
    tipo_persona: "tipoPersona",
  };
  return map[nombreWms] || slugify(nombreWms);
}

function normalizarNombreCapa(nombre = "") {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function obtenerTituloCapaPorId(capaId = "") {
  const etiquetaCapa = document.querySelector(`label[for="${capaId}"]`);
  const textoEtiqueta = etiquetaCapa?.textContent?.trim();
  if (textoEtiqueta) return textoEtiqueta;

  return tituloCapaDesdeNombre(capaId);
}

function obtenerCapasDesdeGetCapabilities(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "text/xml");
  const grupos = [];
  const layerRoot = doc.querySelector("Capability > Layer");
  if (!layerRoot) return grupos;

  layerRoot.querySelectorAll(":scope > Layer").forEach((grupoNode) => {
    const nombreGrupo = grupoNode
      .querySelector(":scope > Title")
      ?.textContent?.trim();
    if (!nombreGrupo || !DEFINICION_GRUPOS_WMS[nombreGrupo]) return;

    const capas = [];
    grupoNode.querySelectorAll(":scope > Layer").forEach((layerNode) => {
      const nombreWms = layerNode
        .querySelector(":scope > Name")
        ?.textContent?.trim();
      if (!nombreWms) return;
      capas.push({
        nombreWms,
        id: idUiDesdeNombreWms(nombreWms),
        titulo:
          layerNode.querySelector(":scope > Title")?.textContent?.trim() ||
          tituloCapaDesdeNombre(nombreWms),
      });
    });

    grupos.push({ nombreGrupo, capas });
  });

  return grupos;
}

function obtenerIdLoteDesdePopup() {
  const filas = Array.from(
    contenido?.querySelectorAll(".popup-lote-row") ?? [],
  );
  const normalizarEtiqueta = (texto = "") =>
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const filaIdLote = filas.find((fila) => {
    const etiqueta = fila.querySelector(".popup-lote-label")?.textContent ?? "";
    return normalizarEtiqueta(etiqueta) === "id lote";
  });

  if (filaIdLote) {
    const valor =
      filaIdLote
        .querySelector(".popup-lote-value")
        ?.textContent?.replace(/\s+/g, "")
        .trim() ?? "";
    if (valor) return valor;
  }

  return "";
}

function construirIdLoteCompleto(idLotePopup) {
  const lote = (idLotePopup || "").replace(/\s+/g, "").trim();
  if (!lote) return "";
  if (lote.startsWith(ubigeo)) return lote;
  return `${ubigeo}${lote}`;
}

function ocultarDetalleLote() {
  if (detalleLoteBody) {
    detalleLoteBody.innerHTML = "";
  }
  detalleLotePanel?.classList.add("d-none");
}

function ocultarFotoLote() {
  if (fotoLoteImg) {
    fotoLoteImg.removeAttribute("src");
  }
  fotoLotePanel?.classList.add("d-none");
}

function toNumero(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isFinite(numero) ? numero : 0;
}

// ── Funciones genéricas de reporte ───────────────────────────────────────────

function obtenerCamposFiltrados(cfg) {
  return cfg.campos.filter(
    ({ key }) => estadosFiltroReporte[cfg.id][key] !== 0,
  );
}

function descargarCsv(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const urlBlob = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = urlBlob;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(urlBlob);
}

function exportarCsvSectorReporte(cfg, codSector, propiedades, camposFiltrados) {
  const totalPredios = toNumero(propiedades.total_predios);
  const filas =
    cfg.chartType === "stacked"
      ? camposFiltrados.map(({ label, campoCon, campoSin }) =>
          [codSector, label, totalPredios, toNumero(propiedades[campoCon]), toNumero(propiedades[campoSin])].join(","),
        )
      : camposFiltrados.map(({ label, key }) =>
          [codSector, label, totalPredios, toNumero(propiedades[key])].join(","),
        );
  descargarCsv([cfg.csvEncabezado, ...filas].join("\n"), cfg.csvNombre(codSector));
}

function construirHtmlSectorReporte(cfg, feature = {}) {
  const propiedades = feature.properties || {};
  const codSector = propiedades.cod_sector || "-";
  const sectorId = `${cfg.sectorIdPrefix}-${String(codSector).replace(/\s+/g, "-")}`;
  const camposFiltrados = obtenerCamposFiltrados(cfg);

  const primerocampo = cfg.campos[0];
  const totalPredios =
    toNumero(propiedades.total_predios) ||
    (cfg.chartType === "stacked" && primerocampo
      ? toNumero(propiedades[primerocampo.campoCon]) + toNumero(propiedades[primerocampo.campoSin])
      : 0);
  const totalLabel =
    totalPredios > 0 ? ` — ${totalPredios.toLocaleString("es-PE")} lotes` : "";

  return {
    sectorId,
    codSector,
    propiedades,
    camposFiltrados,
    html: `<div class="reporte-servicios-sector">
    <div class="reporte-servicios-sector-header">
      <div class="reporte-servicios-sector-title">Sector ${codSector}${totalLabel}</div>
      <button class="btn btn-outline-secondary btn-xs reporte-csv-btn" data-sector="${codSector}">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        CSV
      </button>
    </div>
    <div id="${sectorId}" class="reporte-servicios-chart"></div>
  </div>`,
  };
}

function inicializarGraficasReporte(cfg, sectores) {
  graficasReporte.forEach((chart) => {
    try { chart.destroy(); } catch (_) {}
  });
  graficasReporte = [];

  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  const textColor = isDark ? "#e6ebff" : "#1f2a44";
  const gridColor = isDark ? "rgba(124,160,255,0.15)" : "rgba(31,42,68,0.1)";

  sectores.forEach(({ sectorId, propiedades, camposFiltrados }) => {
    const el = document.getElementById(sectorId);
    if (!el || !camposFiltrados.length) return;

    let series, legend;

    if (cfg.chartType === "stacked") {
      series = [
        {
          name: "Con servicio",
          data: camposFiltrados.map((s) => ({
            x: s.label,
            y: toNumero(propiedades[s.campoCon]),
            fillColor: s.color,
            strokeColor: s.color,
          })),
        },
        {
          name: "Sin servicio",
          data: camposFiltrados.map((s) => ({
            x: s.label,
            y: toNumero(propiedades[s.campoSin]),
            fillColor: COLOR_SIN_SERVICIO,
            strokeColor: COLOR_SIN_SERVICIO,
          })),
        },
      ];
      legend = {
        position: "top",
        fontSize: "11px",
        labels: { colors: textColor },
        showForSingleSeries: false,
        customLegendItems: ["Sin servicio"],
        markers: { fillColors: [COLOR_SIN_SERVICIO] },
      };
    } else {
      series = [
        {
          name: "Predios",
          data: camposFiltrados.map((c) => ({
            x: c.label,
            y: toNumero(propiedades[c.key]),
            fillColor: c.color,
            strokeColor: c.color,
          })),
        },
      ];
      legend = { show: false };
    }

    const plotOptions = {
      bar: {
        borderRadius: 3,
        columnWidth: "55%",
        dataLabels: { position: "top" },
        ...(cfg.chartType === "distribuido" ? { distributed: true } : {}),
      },
    };

    const chart = new ApexCharts(el, {
      chart: {
        type: "bar",
        height: 190,
        toolbar: { show: false },
        background: "transparent",
        foreColor: textColor,
        animations: { enabled: true, speed: 400 },
      },
      theme: { mode: isDark ? "dark" : "light" },
      series,
      xaxis: {
        type: "category",
        labels: { style: { fontSize: "10px", colors: textColor } },
        axisBorder: { color: gridColor },
        axisTicks: { color: gridColor },
      },
      yaxis: { labels: { style: { fontSize: "10px", colors: textColor } } },
      colors: camposFiltrados.map((s) => s.color).concat(
        cfg.chartType === "stacked" ? [COLOR_SIN_SERVICIO] : [],
      ),
      plotOptions,
      dataLabels: {
        enabled: true,
        offsetY: -16,
        style: { fontSize: "9px", colors: [textColor] },
        formatter: (val) => (val > 0 ? val : ""),
      },
      legend,
      tooltip: { theme: isDark ? "dark" : "light" },
      grid: { borderColor: gridColor, strokeDashArray: 3 },
    });
    chart.render();
    graficasReporte.push(chart);
  });
}

function ocultarReportePanel() {
  if (reporteServiciosBody) reporteServiciosBody.innerHTML = "";
  reporteServiciosPanel?.classList.add("d-none");
}

function mostrarReportePanel(cfg, data = {}) {
  if (!reporteServiciosPanel || !reporteServiciosBody) return;
  const titulo = document.getElementById("reporte-servicios-titulo");
  if (titulo) titulo.textContent = cfg.titulo;

  const features = Array.isArray(data.features) ? data.features : [];
  if (!features.length) {
    reporteServiciosBody.innerHTML =
      '<p class="mb-0 small">No se encontraron estadísticas.</p>';
    reporteServiciosPanel.classList.remove("d-none");
    return;
  }

  const sectores = features.map((f) => construirHtmlSectorReporte(cfg, f));
  reporteServiciosBody.innerHTML = sectores.map((s) => s.html).join("");
  reporteServiciosPanel.classList.remove("d-none");

  requestAnimationFrame(() => inicializarGraficasReporte(cfg, sectores));

  reporteServiciosBody.querySelectorAll(".reporte-csv-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sector = sectores.find((s) => String(s.codSector) === btn.dataset.sector);
      if (sector) {
        exportarCsvSectorReporte(cfg, sector.codSector, sector.propiedades, sector.camposFiltrados);
      }
    });
  });
}

async function cargarReporte(cfg) {
  try {
    const url =
      `${direccionServicioWFS}` +
      `version=1.1.0&SERVICE=WFS&REQUEST=GetFeature&TYPENAME=${cfg.wfsTypename}&outputFormat=geojson`;
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`Error HTTP ${respuesta.status}`);
    const data = await respuesta.json();
    cacheReporteData[cfg.id] = data;
    mostrarReportePanel(cfg, data);
  } catch (error) {
    ocultarReportePanel();
    mostrarToast("No se pudo obtener el reporte.", "warning");
  }
}

function sincronizarEstadoDesdeUrl(cfg, urlBase = "") {
  const query = (urlBase.split("?")[1] || "").split("#")[0] || "";
  const params = new URLSearchParams(query);
  const estado = estadosFiltroReporte[cfg.id];

  if (cfg.wmsFiltroParam) {
    // modo codigo=01,02,03
    const codigosActivos = (params.get(cfg.wmsFiltroParam) || "").split(",").filter(Boolean);
    cfg.campos.forEach(({ key, codigo }) => {
      estado[key] = codigo ? (codigosActivos.includes(codigo) ? 1 : 0) : 1;
    });
  } else {
    // modo individual: luz=1, agua=0
    cfg.campos.forEach(({ key }) => {
      const valor = params.get(key);
      estado[key] = valor === null ? 1 : valor === "0" ? 0 : 1;
    });
  }
}

function construirUrlReporte(cfg, baseUrl) {
  const [urlSinHash, hash] = baseUrl.split("#");
  const [ruta, query] = urlSinHash.split("?");
  const params = new URLSearchParams(query || "");

  if (cfg.wmsFiltroParam) {
    const codigosActivos = cfg.campos
      .filter((c) => c.codigo && estadosFiltroReporte[cfg.id][c.key] !== 0)
      .map((c) => c.codigo);
    params.set(cfg.wmsFiltroParam, codigosActivos.length ? codigosActivos.join(",") : "99");
  } else {
    cfg.campos.forEach(({ key }) => {
      params.set(key, String(estadosFiltroReporte[cfg.id][key] ? 1 : 0));
    });
  }

  const nuevaUrl = `${ruta}?${params.toString()}`;
  return hash ? `${nuevaUrl}#${hash}` : nuevaUrl;
}

function renderizarOpcionesFiltroReporte(cfg) {
  const contenedor = document.getElementById(cfg.filtroContenedorId);
  if (!contenedor) return;

  if (cfg.sincronizarDesdeUrl) {
    const capa = buscarCapaId(cfg.id);
    const urlBase = capa?.getSource?.()?.getUrl?.();
    if (urlBase) sincronizarEstadoDesdeUrl(cfg, urlBase);
  }

  const estado = estadosFiltroReporte[cfg.id];
  contenedor.innerHTML = cfg.campos
    .map(
      ({ key, label, color }) =>
        `<div class="form-check d-flex align-items-center gap-2"><input type="checkbox" id="${cfg.checkboxPrefix}_${key}" class="form-check-input" ${estado[key] ? "checked" : ""} /><label class="form-check-label mb-0" for="${cfg.checkboxPrefix}_${key}">${label}</label><span class="badge fw-bolder" style="background: ${color}">&nbsp;</span></div>`,
    )
    .join("");
}

function aplicarFiltroReporte(cfg) {
  const estado = estadosFiltroReporte[cfg.id];
  cfg.campos.forEach(({ key }) => {
    const checkbox = document.getElementById(`${cfg.checkboxPrefix}_${key}`);
    if (checkbox) estado[key] = checkbox.checked ? 1 : 0;
  });

  const capa = buscarCapaId(cfg.id);
  if (capa) {
    const source = capa.getSource();
    const urlBase = source?.getUrl?.();
    if (urlBase) source.setUrl(construirUrlReporte(cfg, urlBase));
  }

  const cachedData = cacheReporteData[cfg.id];
  if (cachedData && !reporteServiciosPanel?.classList.contains("d-none")) {
    mostrarReportePanel(cfg, cachedData);
  }
}

function mostrarFotoLote(urlFoto) {
  if (!fotoLotePanel || !fotoLoteImg || !urlFoto) return;

  fotoLoteImg.src = urlFoto;
  fotoLotePanel.classList.remove("d-none");
}

function ocultarListadoLotes() {
  if (listadoLoteBody) {
    listadoLoteBody.innerHTML = "";
  }
  lotesBusquedaActual = [];
  listadoLotePanel?.classList.add("d-none");
}

function ocultarListadoVias() {
  if (listadoViasBody) {
    listadoViasBody.innerHTML = "";
  }
  viasBusquedaActual = [];
  listadoViasPanel?.classList.add("d-none");
}

function construirNombrePersona(propietario = {}) {
  if (propietario.tipo_persona === "2" && propietario.razon_social) {
    return propietario.razon_social;
  }

  return [propietario.nombres, propietario.razon_social]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function construirTipoDocumento(propietario = {}) {
  const tiposDocumento = {
    "00": "RUC",
    "01": "",
    "02": "DNI",
    "03": "Carnet de identidad de policia nacional",
    "04": "Carnet de identidad de fuerzas armadas",
    "05": "Partida de Nacimiento",
    "06": "Pasaporte",
    "07": "Carnet de extranjería",
    "08": "Otros",
  };

  const tipoDocumento = (propietario.tipo_doc || "")
    .toString()
    .padStart(2, "0");
  const descripcionDocumento = tiposDocumento[tipoDocumento] || tipoDocumento;
  const numeroDocumento = propietario.nume_doc || "-";

  if (!descripcionDocumento) {
    return numeroDocumento;
  }

  return `(${descripcionDocumento}) ${numeroDocumento}`;
}

function limpiarCapaBusquedaLotes() {
  if (!capaBusqueda) return;
  global.mapa.removeLayer(capaBusqueda);
  capaBusqueda = null;
}

function enfocarLoteBusqueda(indice) {
  const loteSeleccionado = lotesBusquedaActual[indice];
  if (!loteSeleccionado) return;

  limpiarCapaBusquedaLotes();

  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(loteSeleccionado, {
      featureProjection: proyeccion3857,
      dataProjection: proyeccion4326,
    }),
  });

  capaBusqueda = new VectorLayer({
    source: vectorSource,
    style: estilo,
    id: `busqueda-lote-${indice}`,
  });

  global.mapa.addLayer(capaBusqueda);
  global.mapa.getView().fit(vectorSource.getExtent(), {
    duration: 1000,
    maxZoom: 19,
    padding: [20, 20, 20, 20],
  });
}

function normalizarBusquedaWFS(tipoCapa, campo, valorBusqueda) {
  if (typeof tipoCapa === "object" && tipoCapa !== null) {
    return {
      tipoCapa: tipoCapa.tipoCapa || "",
      campo: tipoCapa.campo || "",
      valorBusqueda: tipoCapa.valorBusqueda || "",
    };
  }

  return {
    tipoCapa: tipoCapa || "",
    campo: campo || "",
    valorBusqueda: valorBusqueda || "",
  };
}

function renderizarListadoLotes(data) {
  ocultarListadoVias();
  if (!listadoLoteBody || !listadoLotePanel) return;

  const lotes = Array.isArray(data?.features) ? data.features : [];
  if (!lotes.length) {
    ocultarListadoLotes();
    return;
  }

  lotesBusquedaActual = lotes;

  listadoLoteBody.innerHTML = lotes
    .map((feature, index) => {
      const propiedades = feature.properties || {};
      const fotoLote = propiedades.foto_lote || "";
      const foto = fotoLote
        ? `<button type="button" class="btn btn-link btn-sm p-0" data-foto-lote="${rutaFotografia}/${fotoLote}" title="Ver foto">
            <i class="icon feather icon-camera"></i> Ver
          </button>`
        : "-";

      const idFicha = propiedades.id_ficha_individual || "";
      const ficha = idFicha
        ? `<a href="${fichaIndividual}${idFicha}" target="_blank" rel="noopener noreferrer" title="Ver ficha individual">
            <i class="icon feather icon-file-text"></i> Ver
          </a>`
        : "-";

      return `<tr>
        <td class="text-nowrap">${propiedades.id_lote || "-"}</td>
        <td>${propiedades.a_grafi || "-"}</td>
        <td>${propiedades.a_verifi || "-"}</td>
        <td>${foto}</td>
        <td>${ficha}</td>
        <td>
          <button type="button" class="btn btn-link btn-sm p-0" data-indice-lote="${index}" title="Acercarse">
            <i class="icon feather icon-map-pin"></i> Ir
          </button>
        </td>
      </tr>`;
    })
    .join("");

  if (listadoLoteHead) {
    listadoLoteHead.innerHTML = `<tr>
      <th>ID lote</th>
      <th>Área gráfica</th>
      <th>Área verificada</th>
      <th>Foto</th>
      <th>Ficha Individual</th>
      <th>Acción</th>
    </tr>`;
  }
  listadoLotePanel.classList.remove("d-none");
}

function construirTipoPersona(tipoPersona) {
  const tipos = { "1": "Persona Natural", "2": "Persona Jurídica" };
  return tipos[tipoPersona] || "-";
}

function renderizarResultadosPropietarios(resultados) {
  ocultarListadoVias();
  if (!listadoLoteBody || !listadoLotePanel) return;

  if (!resultados.length) {
    ocultarListadoLotes();
    return;
  }

  if (listadoLoteHead) {
    listadoLoteHead.innerHTML = `<tr>
      <th>#</th>
      <th>Propietario</th>
      <th>Tipo</th>
      <th>Documento</th>
      <th>Foto</th>
      <th>Ficha Individual</th>
      <th>ID Lote</th>
      <th>Acción</th>
    </tr>`;
  }

  listadoLoteBody.innerHTML = resultados
    .map((r, i) => {
      const nombre = r.razon_social
        ? r.razon_social
        : [r.ape_paterno, r.ape_materno, r.nombres].filter(Boolean).join(" ");

      const documento = construirTipoDocumento(r);
      const tipoPersona = construirTipoPersona(r.tipo_persona);

      const fotoLote = r.imagen_lote || "";
      const foto = fotoLote
        ? `<button type="button" class="btn btn-link btn-sm p-0" data-foto-lote="${rutaFotografia}/${fotoLote}" title="Ver foto">
            <i class="icon feather icon-camera"></i> Ver
          </button>`
        : "-";

      const idFicha = r.id_ficha_individual || "";
      const ficha = idFicha
        ? `<a href="${fichaIndividual}${idFicha}" target="_blank" rel="noopener noreferrer" title="Ver ficha individual">
            <i class="icon feather icon-file-text"></i> Ver
          </a>`
        : "-";

      const botonAcercarse = r.idlote
        ? `<button type="button" class="btn btn-link btn-sm p-0" data-idlote="${r.idlote}" title="Acercarse">
            <i class="icon feather icon-map-pin"></i> Ir
          </button>`
        : "";

      return `<tr>
        <td>${i + 1}</td>
        <td class="text-nowrap">${nombre || "-"}</td>
        <td class="text-nowrap">${tipoPersona}</td>
        <td class="text-nowrap">${documento}</td>
        <td>${foto}</td>
        <td>${ficha}</td>
        <td class="text-nowrap">${r.idlote || "-"}</td>
        <td>${botonAcercarse}</td>
      </tr>`;
    })
    .join("");

  listadoLotePanel.classList.remove("d-none");
}

async function buscarPropietariosPorEndpoint(endpoint, cuerpo, msgEl) {
  if (msgEl) msgEl.innerHTML = "";
  try {
    const respuesta = await fetch(`${direccionApiGIS}${endpoint}`, {
      method: "POST",
      headers: construirHeadersConCsrf({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(cuerpo),
    });
    const data = await respuesta.json();
    if (!respuesta.ok || !data?.estado) {
      throw new Error(data?.msj || "No se pudo realizar la consulta.");
    }
    if (!data.resultados?.length) {
      if (msgEl)
        msgEl.innerHTML = `<div class="alert alert-sm alert-warning py-1 mb-0">No se encontraron registros.</div>`;
      return;
    }
    ocultarDetalleLote();
    renderizarResultadosPropietarios(data.resultados);
    if (busquedaLoteModal) {
      Modal.getOrCreateInstance(busquedaLoteModal).hide();
    }
  } catch (error) {
    if (msgEl)
      msgEl.innerHTML = `<div class="alert alert-sm alert-danger py-1 mb-0">${error.message}</div>`;
  }
}

function configurarCabeceraListadoVias(tipoBusqueda = "habilitacion_urbana") {
  const head = document.getElementById("listado-vias-head");
  if (!head) return;

  if (tipoBusqueda === "eje_via") {
    head.innerHTML = `<tr>
      <th>Código</th>
      <th>Nombre</th>
      <th>Perímetro (m2)</th>
      <th>Acción</th>
    </tr>`;
    return;
  }

  head.innerHTML = `<tr>
    <th>Tipo</th>
    <th>Nombre</th>
    <th>Superficie (m2)</th>
    <th>Perímetro (m2)</th>
    <th>Acción</th>
  </tr>`;
}

function renderizarListadoVias(
  resultados,
  tipoBusqueda = "habilitacion_urbana",
) {
  ocultarListadoLotes();
  if (!listadoViasBody || !listadoViasPanel) return;

  if (!resultados.length) {
    ocultarListadoVias();
    return;
  }

  configurarCabeceraListadoVias(tipoBusqueda);
  viasBusquedaActual = resultados;

  listadoViasBody.innerHTML = resultados
    .map(({ nombre, feature }, index) => {
      const propiedades = feature?.properties || {};
      const nombreResultado = nombre || feature?.id || "-";

      if (tipoBusqueda === "eje_via") {
        return `<tr>
          <td>${propiedades.cod_via || "-"}</td>
          <td>${nombreResultado}</td>
          <td>${propiedades.peri_grafi || "-"}</td>
          <td>
            <button type="button" class="btn btn-sm btn-primary" data-indice-via="${index}" title="Acercarse" aria-label="Acercarse">
              <i class="icon feather icon-search"></i>
            </button>
          </td>
        </tr>`;
      }

      return `<tr>
        <td>${propiedades.tipo_hab_urb || "Habilitación urbana"}</td>
        <td>${nombreResultado}</td>
        <td>${propiedades.area_grafi || "-"}</td>
        <td>${propiedades.peri_grafi || "-"}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary" data-indice-via="${index}" title="Acercarse" aria-label="Acercarse">
            <i class="icon feather icon-search"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  listadoViasPanel.classList.remove("d-none");
}

function enfocarViaBusqueda(indice) {
  const seleccionado = viasBusquedaActual[indice]?.feature;
  if (!seleccionado) return;

  limpiarCapaBusquedaLotes();

  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(seleccionado, {
      featureProjection: proyeccion3857,
      dataProjection: "EPSG:4326",
    }),
  });

  capaBusqueda = new VectorLayer({
    source: vectorSource,
    style: estilo,
    id: `busqueda-via-${indice}`,
  });

  global.mapa.addLayer(capaBusqueda);
  global.mapa.getView().fit(vectorSource.getExtent(), {
    duration: 1000,
    maxZoom: 19,
    padding: [20, 20, 20, 20],
  });
}

function escaparValorFiltroWFS(valor = "") {
  return valor
    .replace(/!/g, "!!")
    .replace(/\*/g, "!*")
    .replace(/\?/g, "!?")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function construirFiltroLikeWFS(campo, valor) {
  return [
    '<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">',
    '<ogc:PropertyIsLike wildCard="*" singleChar="?" escapeChar="!" matchCase="false">',
    `<ogc:PropertyName>${campo}</ogc:PropertyName>`,
    `<ogc:Literal>*${valor}*</ogc:Literal>`,
    "</ogc:PropertyIsLike>",
    "</ogc:Filter>",
  ].join("");
}

function buscarEnCapaWFS(tipoCapa, campo, valorBusqueda) {
  const parametrosBusqueda = normalizarBusquedaWFS(
    tipoCapa,
    campo,
    valorBusqueda,
  );

  return construirParametrosWFSBusqueda(parametrosBusqueda).then(
    ({ data, features, totalRegistros }) => ({
      data,
      features,
      totalRegistros,
      resultados: features.map((feature) => ({
        tipo: parametrosBusqueda.tipoCapa,
        nombre: feature?.properties?.[parametrosBusqueda.campo] || "",
        feature,
      })),
    }),
  );
}

function construirParametrosWFSBusqueda(tipoCapa, campo, valorBusqueda) {
  const parametrosBusqueda = normalizarBusquedaWFS(
    tipoCapa,
    campo,
    valorBusqueda,
  );
  const valorFiltro = escaparValorFiltroWFS(
    parametrosBusqueda.valorBusqueda.trim(),
  );

  const parametros = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "1.1.0",
    REQUEST: "GetFeature",
    TYPENAME: parametrosBusqueda.tipoCapa,
    SRSNAME: proyeccion3857,
    FILTER: construirFiltroLikeWFS(parametrosBusqueda.campo, valorFiltro),
    OUTPUTFORMAT: formatoGeoJson,
  });

  return fetch(`${direccionServicioWFS}${parametros.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      const features = Array.isArray(data?.features) ? data.features : [];
      const totalRegistros = Number(data?.numberMatched) || features.length;

      return {
        data,
        features,
        totalRegistros,
      };
    });
}

function renderizarDetalleLote(respuesta) {
  ocultarListadoLotes();
  ocultarListadoVias();
  if (!detalleLoteBody || !detalleLotePanel) return;

  const propietarios = Array.isArray(respuesta?.datos_personales)
    ? respuesta.datos_personales
    : [];
  const idFicha = respuesta?.id_ficha_individual || "";

  if (!propietarios.length || !idFicha) {
    ocultarDetalleLote();
    mostrarToast("El lote no cuenta con detalle de propietarios.", "warning");
    return;
  }

  const urlFicha = `${fichaIndividual}${idFicha}`;

  detalleLoteBody.innerHTML = propietarios
    .map((propietario) => {
      const nombres = construirNombrePersona(propietario) || "-";
      return `<tr>
        <td>${propietario.ape_paterno || "-"}</td>
        <td>${propietario.ape_materno || "-"}</td>
        <td>${nombres}</td>
        <td>${construirTipoDocumento(propietario)}</td>
        <td><a href="${urlFicha}" target="_blank" rel="noopener noreferrer">Ver ficha</a></td>
      </tr>`;
    })
    .join("");

  detalleLotePanel.classList.remove("d-none");
}

async function cargarDetalleLoteDesdePopup() {
  if (!document.body.classList.contains("usuario-autenticado")) {
    mostrarToast("Debes iniciar sesión para ver detalles del lote.", "warning");
    return;
  }

  const idLotePopup = obtenerIdLoteDesdePopup();
  const idLoteCompleto = construirIdLoteCompleto(idLotePopup);

  if (!idLoteCompleto) {
    mostrarToast("No se encontró el ID de lote en el popup.", "warning");
    return;
  }

  try {
    const respuesta = await fetch(`${direccionApiGIS}lotes`, {
      method: "POST",
      headers: construirHeadersConCsrf({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ idlote: idLoteCompleto }),
      credentials: "include",
    });

    const data = await respuesta.json();

    if (!respuesta.ok || !data?.estado) {
      throw new Error(data?.msj || "No se pudo obtener el detalle del lote.");
    }

    renderizarDetalleLote(data);
  } catch (error) {
    ocultarDetalleLote();
    mostrarToast(
      error?.message || "No se pudo obtener el detalle del lote.",
      "danger",
    );
  }
}

function formatearContenidoPopup(data) {
  if (!data) return "<p>Sin información disponible.</p>";

  try {
    const autenticado = document.body.classList.contains("usuario-autenticado"),
      parser = new DOMParser(),
      doc = parser.parseFromString(data, "text/html"),
      tabla = doc.querySelector("table");

    const crearContenedorFilas = () => {
      const contenedor = document.createElement("div");
      contenedor.classList.add("popup-lote-vertical");
      return contenedor;
    };

    const agregarFilaNormalizada = (contenedor, etiquetaHtml, valorHtml) => {
      const etiquetaTexto = (etiquetaHtml || "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const valorNormalizado = (valorHtml || "").trim();
      if (!autenticado) {
        const esEtiquetaDetalles = /ver\s*detalles?/i.test(etiquetaTexto);
        const valorTmp = document.createElement("span");
        valorTmp.innerHTML = valorNormalizado;
        const textoValor = valorTmp.textContent?.trim() || "";
        const esEnlaceDetalles = /ver\s*detalles?/i.test(textoValor);
        if (esEtiquetaDetalles || esEnlaceDetalles) return;
      }

      const filaDato = document.createElement("div");
      filaDato.classList.add("popup-lote-row");

      const etiqueta = document.createElement("span");
      etiqueta.classList.add("popup-lote-label");
      etiqueta.textContent = etiquetaTexto || "-";

      const valor = document.createElement("span");
      valor.classList.add("popup-lote-value");
      valor.innerHTML = valorNormalizado || "-";

      const etiquetaNorm = etiquetaTexto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      const enlacesValor = valor.querySelectorAll("a");
      enlacesValor.forEach((a) => {
        const textoEnlace = a.textContent?.trim().toLowerCase() || "";
        if (etiquetaNorm === "fotografia" || textoEnlace === "ir") {
          a.innerHTML = `${feather.icons["camera"].toSvg({ width: 14, height: 14 })} Ir`;
        } else if (textoEnlace === "ver") {
          a.innerHTML = `${feather.icons["file-text"].toSvg({ width: 14, height: 14 })} Ver`;
        }
      });

      filaDato.appendChild(etiqueta);
      filaDato.appendChild(valor);
      contenedor.appendChild(filaDato);
    };

    if (tabla) {
      const headers = Array.from(tabla.querySelectorAll("thead th")).map((th) =>
        th.textContent?.trim(),
      );

      const filas = Array.from(tabla.querySelectorAll("tbody tr, tr")).filter(
        (fila) => {
          const celdas = fila.querySelectorAll("td");
          return celdas.length && !fila.closest("thead");
        },
      );

      const esTablaClaveValor = filas.every(
        (fila) => fila.querySelectorAll("td").length === 2,
      );
      if (esTablaClaveValor) {
        const contenedorVertical = crearContenedorFilas();
        filas.forEach((fila) => {
          const [columna, valor] = Array.from(fila.querySelectorAll("td"));
          agregarFilaNormalizada(
            contenedorVertical,
            columna?.innerHTML,
            valor?.innerHTML,
          );
        });
        if (contenedorVertical.childElementCount > 0) {
          return contenedorVertical.outerHTML;
        }
      }

      const esTablaConCabeceras =
        headers.length > 0 &&
        filas.some(
          (fila) => fila.querySelectorAll("td").length === headers.length,
        );
      if (esTablaConCabeceras) {
        const contenedorVertical = crearContenedorFilas();
        filas.forEach((fila) => {
          const celdas = Array.from(fila.querySelectorAll("td"));
          celdas.forEach((celda, indice) => {
            if (!headers[indice]) return;
            agregarFilaNormalizada(
              contenedorVertical,
              headers[indice],
              celda.innerHTML,
            );
          });
        });

        if (contenedorVertical.childElementCount > 0) {
          return contenedorVertical.outerHTML;
        }
      }

      tabla.classList.add("table", "table-sm", "table-striped", "mb-0");
      const envoltorio = document.createElement("div");
      envoltorio.classList.add("table-responsive", "popup-table-wrapper");
      envoltorio.appendChild(tabla);

      const contenedor = document.createElement("div");
      contenedor.appendChild(envoltorio);
      return contenedor.innerHTML;
    }

    const contenido = doc.body ? doc.body.innerHTML.trim() : "";
    return contenido || "<p>Sin información disponible.</p>";
  } catch (error) {
    console.error("Error al procesar la respuesta de GetFeatureInfo:", error);
    return "<p>Sin información disponible.</p>";
  }
}

legendDiv.innerHTML = "<strong>Leyenda</strong>";
legendDiv.innerHTML += colores[0].texto;
legendDiv.innerHTML += colores[2].texto;

function actualizarTituloTooltip(titulo) {
  if (!legendButton) return;
  const limpio = titulo.replace(/\s+/g, " ").trim();
  legendButton.removeAttribute("title");
  legendButton.setAttribute("data-bs-title", limpio);
  legendButton.setAttribute("aria-label", limpio);
  if (legendButtonLabel) legendButtonLabel.textContent = limpio;
  legendTooltip?.setContent({ ".tooltip-inner": limpio });
}

function actualizarLeyendaVisible(visible) {
  if (!legendDiv || !legendButton) return;
  legendDiv.style.display = visible ? "" : "none";
  legendButton.classList.toggle("btn-primary", visible);
  legendButton.classList.toggle("btn-secondary", !visible);
  actualizarTituloTooltip(visible ? "Ocultar leyenda" : "Mostrar leyenda");
}

actualizarLeyendaVisible(true);

function actualizarLeyenda() {
  legendDiv.innerHTML = "<strong>Leyenda</strong>";
  global.mapa.getLayers().forEach((layer) => {
    if (layer.getVisible()) {
      const color = colores.find((c) => c.id === layer.get("id"));
      if (color) legendDiv.innerHTML += color.texto;
    }
  });
}

const ORDEN_ACCIONES_CAPA = ["identificar", "filtro", "buscar", "descargar"];

function ordenarAccionesCapas(acciones = []) {
  const prioridad = new Map(
    ORDEN_ACCIONES_CAPA.map((accion, indice) => [accion, indice]),
  );

  return [...acciones].sort((accionA, accionB) => {
    const ordenA = prioridad.get(accionA) ?? Number.MAX_SAFE_INTEGER;
    const ordenB = prioridad.get(accionB) ?? Number.MAX_SAFE_INTEGER;
    if (ordenA !== ordenB) return ordenA - ordenB;
    return accionA.localeCompare(accionB);
  });
}

function construirAccion({ accion, id, nombreWms }) {
  const esBusquedaViaHab = ["habilitacion_urbana", "eje_via"].includes(
    nombreWms,
  );
  const mapaAccion = {
    identificar: {
      icono: "info",
      texto: "Identificar",
      dataName: `i${id}`,
    },
    filtro: {
      icono: "filter",
      texto: "Filtro",
      dataName: `f${id}`,
      modal:
        id === "servicioBasico"
          ? "#filtroServicioBasico"
          : id === "clasificacionPredio"
            ? "#filtroClasificacionPredio"
            : id === "tipoPersona"
              ? "#filtroTipoPersona"
              : "#filtroLote",
    },
    buscar: {
      icono: "search",
      texto: "Buscar",
      dataName:
        id === "lote"
          ? "blote"
          : esBusquedaViaHab
            ? `bViaHab:${nombreWms}`
            : `b${id}`,
      modal: esBusquedaViaHab ? "#busquedaViaHab" : "#busquedaLote",
    },
    descargar: {
      icono: "download",
      texto: "Descargar shp.",
      dataName: `d${nombreWms}`,
    },
  };

  const meta = mapaAccion[accion];
  if (!meta) return "";
  const modalAttrs = meta.modal
    ? ` data-bs-toggle="modal" data-bs-target="${meta.modal}"`
    : "";

  return `<a class="dropdown-item" data-name="${meta.dataName}" href=""${modalAttrs}><i data-feather="${meta.icono}" class="icon-md"></i> ${meta.texto}</a>`;
}

function renderizarSidebarDinamico(gruposWms) {
  if (!sidebarNav) return;

  const bloques = [
    `<li class="nav-item nav-category">Cartografía base</li>`,
    `<li class="nav-item"><a class="nav-link" data-bs-toggle="collapse" href="#capasBase" role="button" aria-expanded="false" aria-controls="capasBase"><i class="link-icon" data-feather="layers"></i><span class="link-title">Capa base</span><i class="link-arrow" data-feather="chevron-down"></i></a><div class="collapse show" id="capasBase"><ul class="nav sub-menu">${CAPAS_BASE.map((capa) => `<li class="nav-item"><div class="mb-2">&nbsp;&nbsp;<input type="radio" class="form-radio-input" name="base" id="${capa.id}" ${capa.checked ? "checked" : ""}/><label class="form-check-label" for="${capa.id}">${capa.titulo}</label></div></li>`).join("")}</ul></div></li>`,
  ];

  let categoriaActual = "Cartografía base";

  Object.entries(DEFINICION_GRUPOS_WMS).forEach(([nombreGrupo, definicion]) => {
    const grupo = gruposWms.find((item) => item.nombreGrupo === nombreGrupo);
    if (!grupo || !grupo.capas.length) return;

    if (definicion.categoria && definicion.categoria !== categoriaActual) {
      bloques.push(
        `<li class="nav-item nav-category">${definicion.categoria}</li>`,
      );
      categoriaActual = definicion.categoria;
    }

    const items = grupo.capas
      .map((capa) => {
        registrarCapaWmsDinamica({
          id: capa.id,
          nombreWms: capa.nombreWms,
          visible: capa.id === "provincia" || capa.id === "sector",
        });
        const accionesBase = [...(definicion.acciones || [])];
        const nombreWmsNormalizado = normalizarNombreCapa(capa.nombreWms);
        const extras =
          definicion.extrasPorCapa?.[capa.nombreWms] ||
          definicion.extrasPorCapa?.[nombreWmsNormalizado] ||
          [];
        const acciones = ordenarAccionesCapas([
          ...new Set([...accionesBase, ...extras]),
        ]);
        const checked = capa.id === "provincia" || capa.id === "sector";

        if (!acciones.length) {
          return `<li class="nav-item"><div class="form-check form-switch mb-2 layer-toggle-item"><input type="checkbox" class="form-check-input" id="${capa.id}" data-wms-name="${capa.nombreWms}" ${checked ? "checked" : ""}/><label class="form-check-label" for="${capa.id}"><span class="layer-label-text">${capa.titulo}</span></label></div></li>`;
        }

        if (definicion.identificarDirecto) {
          return `<li class="nav-item"><div class="form-check form-switch mb-2 layer-toggle-item"><input type="checkbox" class="form-check-input" id="${capa.id}" data-wms-name="${capa.nombreWms}" ${checked ? "checked" : ""}/><label class="form-check-label" for="${capa.id}"><span class="layer-label-text">${capa.titulo}</span></label><button id="btn${capa.id}" type="button" class="btn btn-icon btn-xs layer-action-button" data-name="i${capa.id}" aria-label="Identificar ${capa.titulo}" style="display: ${checked ? "" : "none"}"><i data-feather="info"></i></button></div></li>`;
        }

        const iconoBoton = definicion.filtroSolo ? "filter" : "settings";
        return `<li class="nav-item"><div class="form-check form-switch mb-2 layer-toggle-item"><input type="checkbox" class="form-check-input" id="${capa.id}" data-wms-name="${capa.nombreWms}" ${checked ? "checked" : ""}/><label class="form-check-label" for="${capa.id}"><span class="layer-label-text">${capa.titulo}</span></label><button id="btn${capa.id}" type="button" class="btn btn-icon btn-xs" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false" style="display: ${checked ? "" : "none"}"><i data-feather="${iconoBoton}"></i></button><div class="dropdown-menu" aria-labelledby="btn${capa.id}">${acciones.map((accion) => construirAccion({ accion, id: capa.id, nombreWms: capa.nombreWms })).join("")}</div></div></li>`;
      })
      .join("");

    bloques.push(
      `<li class="nav-item"><a class="nav-link" data-bs-toggle="collapse" href="#${definicion.id}" role="button" aria-expanded="false" aria-controls="${definicion.id}"><i class="link-icon" data-feather="${definicion.icono}"></i><span class="link-title">${definicion.titulo || nombreGrupo}</span><i class="link-arrow" data-feather="chevron-down"></i></a><div class="collapse ${["prediosUrbanos"].includes(definicion.id) ? "show" : ""}" data-bs-parent="#sidebarNav" id="${definicion.id}"><ul class="nav sub-menu">${items}</ul></div></li>`,
    );
  });

  sidebarNav.innerHTML = bloques.join("");
  feather.replace();
}

async function inicializarSidebarCapas() {
  try {
    const respuesta = await fetch(
      `${direccionServicioWMS}service=WMS&request=GetCapabilities`,
    );
    const texto = await respuesta.text();
    const grupos = obtenerCapasDesdeGetCapabilities(texto);
    renderizarSidebarDinamico(grupos);
    actualizarLeyenda();
  } catch (error) {
    console.error("No se pudo cargar GetCapabilities", error);
  }
}

function activarBoton(id, estado) {
  const button = document.getElementById("btn" + id);
  if (!button) return;
  if (estado) button.style.display = "";
  else button.style.display = "none";
}

legendButton?.addEventListener("click", () => {
  const visible = legendDiv.style.display !== "none";
  actualizarLeyendaVisible(!visible);
  legendTooltip?.hide();
});

function activarCapaBase(id) {
  if (id === "osm") {
    global.osm.setVisible(true);
    global.ortofoto.setVisible(false);
    global.googleSatelite.setVisible(false);
    global.googleCalles.setVisible(false);
    global.esriModoNoche.setVisible(false);
  } else if (id === "ortofoto") {
    global.osm.setVisible(false);
    global.ortofoto.setVisible(true);
    global.googleSatelite.setVisible(false);
    global.googleCalles.setVisible(false);
    global.esriModoNoche.setVisible(false);
  } else if (id === "googleMapSatelite") {
    global.osm.setVisible(false);
    global.ortofoto.setVisible(false);
    global.googleSatelite.setVisible(true);
    global.googleCalles.setVisible(false);
    global.esriModoNoche.setVisible(false);
  } else if (id === "googleMapCalle") {
    global.osm.setVisible(false);
    global.ortofoto.setVisible(false);
    global.googleSatelite.setVisible(false);
    global.googleCalles.setVisible(true);
    global.esriModoNoche.setVisible(false);
  } else if (id === "esriModoNoche") {
    global.osm.setVisible(false);
    global.ortofoto.setVisible(false);
    global.googleSatelite.setVisible(false);
    global.googleCalles.setVisible(false);
    global.esriModoNoche.setVisible(true);
  }
}

reportesConfig.forEach((cfg) => {
  const modal = document.getElementById(cfg.modalId);
  modal?.addEventListener("show.bs.modal", () => renderizarOpcionesFiltroReporte(cfg));
  modal?.addEventListener("hide.bs.modal", () => {
    if (modal.contains(document.activeElement)) document.activeElement?.blur?.();
  });
  document.getElementById(cfg.filtrarBtnId)?.addEventListener("click", (event) => {
    event.currentTarget?.blur?.();
    aplicarFiltroReporte(cfg);
  });
});

function procesarAccionCapa(nombre) {
  if (!nombre) return;
  if (nombre.substring(0, 1) === "i") {
    global.activoInformacion = nombre.substring(1);
  } else if (nombre === "blote") {
    document.getElementById("buscarPorIdLoteInput").value = "";
    mensajeBuscarLote.innerHTML = "";
  } else if (nombre.startsWith("bViaHab")) {
    const tipoBusqueda = nombre.split(":")[1] || "habilitacion_urbana";
    tipoBusquedaViaHabActual = CONFIG_BUSQUEDA_VIA_HAB[tipoBusqueda]
      ? tipoBusqueda
      : "habilitacion_urbana";

    const configuracion =
      CONFIG_BUSQUEDA_VIA_HAB[tipoBusquedaViaHabActual] ||
      CONFIG_BUSQUEDA_VIA_HAB.habilitacion_urbana;

    if (busquedaViaHabTitulo) {
      busquedaViaHabTitulo.innerHTML = `<i data-feather="search"></i> ${configuracion.titulo}`;
    }
    if (busquedaViaHabEtiqueta) {
      busquedaViaHabEtiqueta.innerHTML = `<strong>${configuracion.etiqueta}</strong>`;
    }
    if (valorViaHabInput) {
      valorViaHabInput.value = "";
      valorViaHabInput.placeholder = configuracion.placeholder;
    }

    if (mensajeBuscarViaHab) {
      mensajeBuscarViaHab.innerHTML = "";
    }

    feather.replace();
  } else if (nombre.substring(0, 1) === "d") {
    const nombreCapa = nombre.substring(1);
    const url =
      direccionServicioWFS +
      "service=WFS&request=GetFeature&VERSION=1.1.0&outputFormat=SHAPE-ZIP&typeName=" +
      nombreCapa;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${nombreCapa}_${fechaHoy()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

sidebarNav?.addEventListener("click", (event) => {
  const radioBase = event.target.closest('input[type="radio"][name="base"]');
  if (radioBase) {
    activarCapaBase(radioBase.id);
    return;
  }

  const action = event.target.closest(".dropdown-item, .layer-action-button");
  if (action) {
    event.preventDefault();
    procesarAccionCapa(action.getAttribute("data-name")?.toString());
    return;
  }

  const checkbox = event.target.closest(
    'input[type="checkbox"].form-check-input',
  );
  if (!checkbox) return;
  if (checkbox.id === "conFichaLote" || checkbox.id === "sinFichaLote") return;

  const capaTematica = buscarCapaId(checkbox.id);
  if (capaTematica != null) {
    activarBoton(checkbox.id, checkbox.checked);
  }
  capaTematica?.setVisible(checkbox.checked);

  const cfgReporte = reportesConfig.find((cfg) => cfg.id === checkbox.id);
  if (cfgReporte) {
    if (checkbox.checked) cargarReporte(cfgReporte);
    else ocultarReportePanel();
  }

  actualizarLeyenda();
});

inicializarSidebarCapas();

detalleLoteCerrar?.addEventListener("click", () => {
  ocultarDetalleLote();
});

listadoLoteCerrar?.addEventListener("click", () => {
  ocultarListadoLotes();
});

fotoLoteCerrar?.addEventListener("click", () => {
  ocultarFotoLote();
});

reporteServiciosCerrar?.addEventListener("click", () => {
  ocultarReportePanel();
});

contenido?.addEventListener("click", (event) => {
  const enlace = event.target.closest("a");
  if (!enlace) return;

  const fila = enlace.closest(".popup-lote-row");
  const etiqueta =
    fila
      ?.querySelector(".popup-lote-label")
      ?.textContent?.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase() || "";

  const texto = enlace.textContent?.trim().toLowerCase() || "";

  if (etiqueta === "fotografia" || texto === "ir") {
    event.preventDefault();
    const urlFoto = enlace.getAttribute("href")?.trim() || "";
    if (urlFoto && urlFoto !== "#") {
      mostrarFotoLote(urlFoto);
    } else {
      mostrarToast("El lote no cuenta con fotografía.", "warning");
      ocultarFotoLote();
    }
    return;
  }

  if (enlace.getAttribute("href") === "#" || texto === "ver") {
    event.preventDefault();
    cargarDetalleLoteDesdePopup();
  }
});

document.addEventListener("estado-autenticacion", (event) => {
  if (!event.detail?.autenticado) {
    ocultarDetalleLote();
    ocultarListadoLotes();
    ocultarListadoVias();
    ocultarFotoLote();
  }
});

export function obtenerInformacion(e) {
  const coordenadas = e.coordinate;
  const resolucionVista = /** @type {number} */ (global.vista.getResolution());
  const capaActivaId = global.activoInformacion;

  if (!capaActivaId) return;

  const capaActiva = buscarCapaId(capaActivaId);
  if (!capaActiva || !capaActiva.getVisible()) return;

  if (popupTitle) {
    popupTitle.textContent = `Información: ${obtenerTituloCapaPorId(capaActivaId)}`;
  }

  const source = capaActiva.getSource();
  if (!(source instanceof ImageWMS)) return;

  const url = source.getFeatureInfoUrl(
    coordenadas,
    resolucionVista,
    proyeccion3857,
    { INFO_FORMAT: formatoTexto, FEATURE_COUNT: 10 },
  );

  if (!url) return;

  //console.log(url);
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      ocultarDetalleLote();
      ocultarListadoLotes();
      ocultarListadoVias();
      ocultarFotoLote();
      contenido.innerHTML = formatearContenidoPopup(data);
      global.cubrir.setPosition(e.coordinate);
    })
    .catch((error) => {
      console.error("Error al obtener GetFeatureInfo:", error);
      ocultarDetalleLote();
      ocultarListadoLotes();
      ocultarListadoVias();
      ocultarFotoLote();
      contenido.innerHTML = `<p>No se pudo obtener información de la capa ${capaActivaId} seleccionada.</p>`;
      global.cubrir.setPosition(e.coordinate);
    });
}

document.getElementById("filtrarLote").addEventListener("click", function () {
  let codigo = "",
    conFicha = document.getElementById("conFichaLote").checked,
    sinFicha = document.getElementById("sinFichaLote").checked;

  if (conFicha && sinFicha) {
    codigo = "1,2";
  } else {
    if (conFicha) {
      codigo = "1";
    } else if (sinFicha) {
      codigo = "2";
    }
  }
  let lote = buscarCapaId("lote");
  if (lote) {
    const source = lote.getSource();
    let url = `${source.getUrl()}codigo=${codigo}&`;
    source.setUrl(url);
  }
});

const ejecutarBusquedaPorIdLote = () => {
  const buscarPorIdLoteInput = document.getElementById("buscarPorIdLoteInput");
  const valorBusqueda = buscarPorIdLoteInput.value.trim();

  if (!valorBusqueda.length) {
    mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    buscarPorIdLoteInput.focus();
    return;
  }

  buscarEnCapaWFS({
    tipoCapa: "lote",
    campo: "id_lote",
    valorBusqueda,
  })
    .then(({ data, totalRegistros }) => {
      if (totalRegistros > 0) {
        ocultarDetalleLote();
        mensajeBuscarLote.innerHTML = "";
        renderizarListadoLotes(data);
        if (busquedaLoteModal) {
          Modal.getOrCreateInstance(busquedaLoteModal).hide();
        }
      } else {
        limpiarCapaBusquedaLotes();
        ocultarListadoLotes();
        ocultarListadoVias();
        mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
        buscarPorIdLoteInput.focus();
      }
    })
    .catch((error) => {
      console.log("Error al obtener los datos WFS:", error);
      mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se pudo realizar la consulta.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    });
};

btnBuscarPorIdLote.addEventListener("click", ejecutarBusquedaPorIdLote);

document.getElementById("buscarPorIdLoteInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") ejecutarBusquedaPorIdLote();
});

buscarViaHab?.addEventListener("click", function () {
  const valorBusqueda = valorViaHabInput?.value.trim() || "";
  const configuracion =
    CONFIG_BUSQUEDA_VIA_HAB[tipoBusquedaViaHabActual] ||
    CONFIG_BUSQUEDA_VIA_HAB.habilitacion_urbana;

  if (!valorBusqueda.length) {
    mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    valorViaHabInput?.focus();
    return;
  }

  buscarEnCapaWFS(tipoBusquedaViaHabActual, configuracion.campo, valorBusqueda)
    .then(({ resultados, totalRegistros }) => {
      if (totalRegistros > 0) {
        ocultarDetalleLote();
        mensajeBuscarViaHab.innerHTML = "";
        renderizarListadoVias(resultados, tipoBusquedaViaHabActual);
        if (busquedaViaHabModal) {
          Modal.getOrCreateInstance(busquedaViaHabModal).hide();
        }
      } else {
        limpiarCapaBusquedaLotes();
        ocultarListadoVias();
        mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
        valorViaHabInput?.focus();
      }
    })
    .catch((error) => {
      console.log("Error al obtener los datos WFS de búsqueda:", error);
      mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se pudo realizar la consulta.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    });
});

listadoLoteBody?.addEventListener("click", (event) => {
  const botonFoto = event.target.closest("button[data-foto-lote]");
  if (botonFoto) {
    event.preventDefault();
    const urlFoto = botonFoto.dataset.fotoLote || "";
    if (urlFoto) {
      mostrarFotoLote(urlFoto);
    } else {
      mostrarToast("El lote no cuenta con fotografía.", "warning");
      ocultarFotoLote();
    }
    return;
  }

  const botonAcercarse = event.target.closest("button[data-indice-lote]");
  if (botonAcercarse) {
    const indice = Number(botonAcercarse.dataset.indiceLote);
    enfocarLoteBusqueda(indice);
    return;
  }

  const botonIdlote = event.target.closest("button[data-idlote]");
  if (!botonIdlote) return;

  const idlote = botonIdlote.dataset.idlote;
  if (!idlote) return;

  buscarEnCapaWFS({ tipoCapa: "lote", campo: "id_lote", valorBusqueda: idlote })
    .then(({ data, totalRegistros }) => {
      if (totalRegistros > 0) {
        lotesBusquedaActual = data.features || [];
        enfocarLoteBusqueda(0);
      } else {
        mostrarToast("No se encontró el lote en el mapa.", "warning");
      }
    })
    .catch(() => mostrarToast("Error al buscar el lote.", "danger"));
});

listadoViasCerrar?.addEventListener("click", () => {
  ocultarListadoVias();
});

listadoViasBody?.addEventListener("click", (event) => {
  const botonAcercarse = event.target.closest("button[data-indice-via]");
  if (!botonAcercarse) return;

  const indice = Number(botonAcercarse.dataset.indiceVia);
  enfocarViaBusqueda(indice);
});

// ── Búsqueda por documento / titular (requiere autenticación) ────────────────

document.addEventListener("estado-autenticacion", ({ detail }) => {
  if (busquedaLoteAuth)
    busquedaLoteAuth.classList.toggle("d-none", !detail.autenticado);
});

btnBuscarPorDoc?.addEventListener("click", () => {
  const valor = buscarPorDocInput?.value.trim();
  if (!valor) {
    if (msgBuscarPorDoc)
      msgBuscarPorDoc.innerHTML = `<div class="alert alert-sm alert-warning py-1 mb-0">Ingresa un número de documento.</div>`;
    buscarPorDocInput?.focus();
    return;
  }
  buscarPropietariosPorEndpoint("lotes/documento", { num_doc: valor }, msgBuscarPorDoc);
});

buscarPorDocInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnBuscarPorDoc?.click();
});

btnBuscarPorTitular?.addEventListener("click", () => {
  const valor = buscarPorTitularInput?.value.trim();
  if (!valor) {
    if (msgBuscarPorTitular)
      msgBuscarPorTitular.innerHTML = `<div class="alert alert-sm alert-warning py-1 mb-0">Ingresa un texto para buscar.</div>`;
    buscarPorTitularInput?.focus();
    return;
  }
  buscarPropietariosPorEndpoint("lotes/titulares", { texto: valor }, msgBuscarPorTitular);
});

buscarPorTitularInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnBuscarPorTitular?.click();
});
