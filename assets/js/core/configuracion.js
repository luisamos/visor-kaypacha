import * as bootstrap from "bootstrap";
import proj4 from "proj4";

import Style from "ol/style/Style";
import Icon from "ol/style/Icon";

import imagenVerde from "../../images/ubicacionVerde.png";
import imgLogoMdw from "../../images/logo-mdw.png";
import imgLogoMdwWhite from "../../images/logo-mdw-white.png";
import imgProyectoCatastroMdw from "../../images/proyecto-catastro-mdw.jpg";
import imgLogoMpc from "../../images/logo-mpc.png";
import imgLogoMpcWhite from "../../images/logo-mpc-white.png";
import imgProyectoCatastroMpc from "../../images/proyecto-catastro-mpc.png";
import imgLogoMdm from "../../images/logo-mdm.png";
import imgLogoMdmWhite from "../../images/logo-mdm-white.png";
import imgProyectoCatastroMdm from "../../images/proyecto-catastro-mdm.png";

const IS_DEV = true,
  UBIGEO = "081304";

// ── Definiciones proj4 centralizadas ───────────────────────────────────────
// Agrega aquí cualquier proyección que necesite un municipio.
// Solo hay que registrarla una vez; todos los módulos la heredan.
const PROJ4_DEFINICIONES = {
  "EPSG:4326": "+proj=longlat +datum=WGS84 +no_defs",
  "EPSG:3857":
    "+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs +type=crs",
  "EPSG:32717":
    "+proj=utm +zone=17 +south +datum=WGS84 +units=m +no_defs +type=crs",
  "EPSG:32718":
    "+proj=utm +zone=18 +south +datum=WGS84 +units=m +no_defs +type=crs",
  "EPSG:32719":
    "+proj=utm +zone=19 +south +datum=WGS84 +units=m +no_defs +type=crs",
};
Object.entries(PROJ4_DEFINICIONES).forEach(([epsg, def]) =>
  proj4.defs(epsg, def),
);

const configuracionPorUbigeo = {
    "080108": {
      HOST: IS_DEV ? "http://127.0.0.2" : "https://catastro.muniwanchaq.gob.pe",
      PORT: IS_DEV ? "80" : "9100",
      xy: [-8009512.641541751, -1520541.7489204113],
      zoom: 15,
      titulo: "Municipalidad Distrital de Wanchaq",
      siglas: "MDW",
      logo_light: imgLogoMdw,
      logo_dark: imgLogoMdwWhite,
      logo_container: imgProyectoCatastroMdw,
      ficha_individual:
        "https://catastro.muniwanchaq.gob.pe:9100/pdf/individual/",
      ruta_fotografia:
        "https://catastro.muniwanchaq.gob.pe:9100/storage/img/imageneslotes/",
      ortofotos: "ortofoto",
      // Proyección de visualización UTM para este municipio.
      // Cambiar aquí si se despliega en otra zona UTM o país.
      proyeccion_display: "EPSG:32719",
      proyeccion_display_texto: "WGS84 - Zona 19L",
    },
    "080601": {
      HOST: IS_DEV ? "http://127.0.0.2" : "http://10.0.10.66",
      PORT: IS_DEV ? "80" : "8081",
      xy: [-7929226.8315, -1604831.885],
      zoom: 13,
      titulo: "Municipalidad Provincial de Canchis",
      siglas: "MPC",
      logo_light: imgLogoMpc,
      logo_dark: imgLogoMpcWhite,
      logo_container: imgProyectoCatastroMpc,
      ficha_individual: "",
      ruta_fotografia: "",
      ortofotos: "mpc_tramo_01,mpc_tramo_02",
      proyeccion_display: "EPSG:32719",
      proyeccion_display_texto: "WGS84 - Zona 19L",
    },
    "081304": {
      HOST: IS_DEV ? "http://127.0.0.2" : "http://192.168.1.201",
      PORT: IS_DEV ? "80" : "80",
      xy: [-8070680.565559075, -1482761.9409198675],
      zoom: 15,
      titulo: "Municipalidad Distrital de Machupicchu",
      siglas: "MDM",
      logo_light: imgLogoMdm,
      logo_dark: imgLogoMdmWhite,
      logo_container: imgProyectoCatastroMdm,
      ficha_individual: "",
      ruta_fotografia: "",
      ortofotos: "mdm_tramo_01,mdm_tramo_02",
      proyeccion_display: "EPSG:32718",
      proyeccion_display_texto: "WGS84 - Zona 18L",
    },
  },
  configuracionUbigeo =
    configuracionPorUbigeo[UBIGEO] ?? configuracionPorUbigeo["080108"],
  {
    HOST,
    PORT,
    xy,
    zoom,
    titulo,
    siglas,
    logo_light,
    logo_dark,
    logo_container,
    ficha_individual,
    ruta_fotografia,
    ortofotos,
    proyeccion_display,
    proyeccion_display_texto,
  } = configuracionUbigeo;

const SERVICIOS_BASICOS = [
  { key: "luz", label: "Luz", color: "#00aae4" },
  { key: "agua", label: "Agua", color: "#6ae1ff" },
  { key: "telefono", label: "Telefono", color: "#c0c0c4" },
  { key: "desague", label: "Desague", color: "#593cc5" },
  { key: "gas", label: "Gas", color: "#eeeec4" },
  { key: "internet", label: "Internet", color: "#efeeff" },
  { key: "tvcable", label: "TvCable", color: "#ff9d44" },
];

const CAMPOS_CLASIFICACION_PREDIO = [
  {
    key: "casa_habitacion",
    label: "Casa - Habitación",
    color: "#073763",
    codigo: "01",
    estadoInicial: 1,
  },
  {
    key: "tienda_deposito_almacen",
    label: "Tienda - Depósito - Almacén",
    color: "#0b5394",
    codigo: "02",
    estadoInicial: 1,
  },
  {
    key: "predio_en_edificio",
    label: "Predio en edificación",
    color: "#3d85c6",
    codigo: "03",
    estadoInicial: 1,
  },
  {
    key: "terreno_sin_construir",
    label: "Terreno sin construcción",
    color: "#9fc5e8",
    codigo: "05",
    estadoInicial: 1,
  },
  {
    key: "otros",
    label: "Otros",
    color: "#6fa8dc",
    codigo: "04",
    estadoInicial: 1,
  },
  {
    key: "sin_clasificacion",
    label: "Sin clasificación",
    color: "#ff0000",
    codigo: "99",
    estadoInicial: 1,
  },
];

const CAMPOS_TIPO_PERSONA = [
  {
    key: "persona_natural",
    label: "Persona natural",
    color: "#3bc500",
    codigo: "1",
    estadoInicial: 1,
  },
  {
    key: "persona_juridica",
    label: "Persona jurídica",
    color: "#005700",
    codigo: "2",
    estadoInicial: 1,
  },
  {
    key: "sin_tipo_persona",
    label: "Sin clasificación",
    color: "#ff0000",
    codigo: "0",
    estadoInicial: 0,
  },
];

function construirLeyendaDesdeReporte(titulo, campos) {
  const items = campos
    .map(
      ({ label, color }) =>
        `<div class="legend-item2"><i style="background:${color}"></i> ${label}</div>`,
    )
    .join("\n        ");
  return `<div class="legend-item"><strong>${titulo}</strong></div>
        ${items}
        <div class="legend-item"></div>`;
}

function construirLeyendaServicioBasico(servicios = SERVICIOS_BASICOS) {
  const items = servicios
    .map(
      ({ label, color }) =>
        `<div class="legend-item2"><i style="background:${color}"></i> ${label}</div>`,
    )
    .join("\n");

  return `<div class="legend-item"><strong>Servicio básico</strong></div>
        ${items}
        <div class="legend-item"></div>`;
}

export const ubigeo = UBIGEO,
  centroide3857 = xy,
  fichaIndividual = ficha_individual,
  rutaFotografia = ruta_fotografia,
  ortoFotos = ortofotos,
  zoomMapa = zoom,
  // Cuántos niveles de zoom se resta al mapa principal para el mini mapa.
  MINI_MAPA_ZOOM_OFFSET = 4,
  hostServicios = HOST,
  puertoServicios = PORT,
  tituloMunicipalidad = titulo,
  siglasMunicipalidad = siglas,
  logoMiniLight = logo_light,
  logoMiniDark = logo_dark,
  logoContainer = logo_container,
  proyeccion3857 = "EPSG:3857",
  proyeccion4326 = "EPSG:4326",
  proyeccion32717 = "EPSG:32717",
  proyeccion32718 = "EPSG:32718",
  proyeccion32719 = "EPSG:32719",
  // Proyección activa de visualización del municipio (fuente única de verdad).
  // Cualquier módulo que necesite mostrar coordenadas al usuario importa estos.
  proyeccionDisplay = proyeccion_display,
  proyeccionDisplayTexto = proyeccion_display_texto,
  direccionServicioWMS = `${HOST}:${PORT}/servicio/wms?`,
  direccionServicioWFS = `${HOST}:${PORT}/servicio/wfs?`,
  direccionServicioMapCache = IS_DEV
    ? `${HOST}:${PORT}/mapcache/?`
    : `${HOST}:${PORT}/cgi-bin/mapcache/?`,
  direccionApiGIS = `${HOST}:5000/`,
  formatoPNG = "image/png",
  formatoJPEG = "image/jpeg",
  formatoJson = "application/json",
  formatoGeoJson = "geojson",
  formatoTexto = "text/html",
  serviciosBasicosConfig = SERVICIOS_BASICOS.map((item) => ({ ...item })),
  colores = [
    {
      id: "provincia",
      texto:
        '<div class="legend-item"><i style="background:#26a69a;"></i> Provincia</div>',
    },
    {
      id: "distrito",
      texto:
        '<div class="legend-item"><i style="background:#26a69a;"></i> Distrito</div>',
    },
    {
      id: "sector",
      texto:
        '<div class="legend-item"><i style="background:#9900CC;"></i> Sector</div>',
    },
    {
      id: "manzana",
      texto:
        '<div class="legend-item"><i style="background:#00FFFF;"></i> Manzana</div>',
    },
    {
      id: "lote",
      texto: `<div class="legend-item"><strong>Lote</strong></div>
              <div class="legend-item2"><i style="background:#000000;"></i> Con Ficha</div>
              <div class="legend-item2"><i style="background:#ff6600;"></i> Sin Ficha</div>
              <div class="legend-item"></div>`,
    },
    {
      id: "ejeVia",
      texto:
        '<div class="legend-item"><i style="background:#adadad; height:3px; margin-top:7px; border-radius:2px;"></i> Eje de vía</div>',
    },
    {
      id: "habilitacionUrbana",
      texto:
        '<div class="legend-item"><i style="background:#0000ff"></i> Habilitación Urbana</div>',
    },
    {
      id: "comercio",
      texto: `<div class="legend-item"><strong>Comercio</strong></div>
            <div class="legend-item2"><i style="background:#ff0000"></i> 1</div>
            <div class="legend-item"></div>`,
    },
    {
      id: "construccion",
      texto: `<div class="legend-item"><strong>Construcción</strong></div>
            <div class="legend-item2"><i style="background:#ffff00"></i> 1</div>
            <div class="legend-item"></div>`,
    },
    {
      id: "parque",
      texto:
        '<div class="legend-item"><i style="background:#00FF3F"></i> Parque</div>',
    },
    {
      id: "puerta",
      texto: `<div class="legend-item"><strong>Puerta</strong></div>
                <div class="legend-item2"><i style="background:#000000; border-radius:50%; width:11px; height:11px; margin-top:3px;"></i> P</div>
                <div class="legend-item2"><i style="background:#ff0000; border-radius:50%; width:11px; height:11px; margin-top:3px;"></i> S</div>
                <div class="legend-item2"><i style="background:#ffff00; border-radius:50%; width:11px; height:11px; margin-top:3px;"></i> G</div>
                <div class="legend-item"></div>`,
    },
    {
      id: "servicioBasico",
      texto: construirLeyendaServicioBasico(serviciosBasicosConfig),
    },
    {
      id: "clasificacionPredio",
      texto: construirLeyendaDesdeReporte(
        "Clasificación de Predio",
        CAMPOS_CLASIFICACION_PREDIO,
      ),
    },
    {
      id: "tipoPersona",
      texto: construirLeyendaDesdeReporte(
        "Tipo de persona",
        CAMPOS_TIPO_PERSONA,
      ),
    },
    {
      id: "predio",
      texto:
        '<div class="legend-item"><i style="background:#9a7051"></i> Bienes del estado SBN</div>',
    },
  ],
  estiloMarcadorVerde = new Style({
    image: new Icon({
      anchor: [0.2, 20],
      anchorXUnits: "fraction",
      anchorYUnits: "pixels",
      src: imagenVerde,
    }),
  });

// ── Configuración centralizada de reportes ──────────────────────────────────────────────
export const reportesConfig = [
  {
    id: "servicioBasico",
    wfsTypename: "reporte_servicio_basico",
    titulo: "Estadísticas de servicios básicos",
    checkboxPrefix: "filtroServicioBasico",
    modalId: "filtroServicioBasico",
    filtroContenedorId: "filtroServicioBasicoOpciones",
    filtrarBtnId: "filtrarServicioBasico",
    csvNombre: (cod) => `reporte_servicios_sector_${cod}.csv`,
    csvEncabezado: "Sector,Servicio,Total Predios,Con Servicio,Sin Servicio",
    sectorIdPrefix: "sector-chart",
    chartType: "stacked",
    wmsFiltroParam: null,
    sincronizarDesdeUrl: true,
    campos: SERVICIOS_BASICOS.map(({ key, label, color }) => ({
      key,
      label,
      color,
      campoCon: `predios_con_${key}`,
      campoSin: `predios_sin_${key}`,
      codigo: null,
      estadoInicial: 1,
    })),
  },
  {
    id: "clasificacionPredio",
    wfsTypename: "reporte_clasificacion_predio",
    titulo: "Estadísticas de clasificación del predio",
    checkboxPrefix: "filtroClasifPredio",
    modalId: "filtroClasificacionPredio",
    filtroContenedorId: "filtroClasificacionPredioOpciones",
    filtrarBtnId: "filtrarClasificacionPredio",
    csvNombre: (cod) => `reporte_clasificacion_sector_${cod}.csv`,
    csvEncabezado: "Sector,Clasificación,Total Predios,Cantidad",
    sectorIdPrefix: "sector-clasif",
    chartType: "distribuido",
    wmsFiltroParam: "codigo",
    sincronizarDesdeUrl: false,
    campos: CAMPOS_CLASIFICACION_PREDIO,
  },
  {
    id: "tipoPersona",
    wfsTypename: "reporte_tipo_persona",
    titulo: "Estadísticas de tipo de persona",
    checkboxPrefix: "filtroTipoPersona",
    modalId: "filtroTipoPersona",
    filtroContenedorId: "filtroTipoPersonaOpciones",
    filtrarBtnId: "filtrarTipoPersona",
    csvNombre: (cod) => `reporte_tipo_persona_sector_${cod}.csv`,
    csvEncabezado: "Sector,Tipo Persona,Total Predios,Cantidad",
    sectorIdPrefix: "sector-persona",
    chartType: "distribuido",
    wmsFiltroParam: "codigo",
    sincronizarDesdeUrl: false,
    campos: CAMPOS_TIPO_PERSONA,
  },
];

export const COLOR_SIN_SERVICIO = "#64748b";

export const CAPAS_BASE = [
  { id: "ortofoto", titulo: "Ortofoto", checked: false },
  { id: "googleMapCalle", titulo: "Google calles", checked: false },
  { id: "googleMapSatelite", titulo: "Google satélite", checked: true },
  { id: "osm", titulo: "Open Street Map", checked: false },
  { id: "esriModoNoche", titulo: "Esri modo noche", checked: false },
];

export const DEFINICION_GRUPOS_WMS = {
  IGN: {
    id: "limiteIGN",
    icono: "globe",
    acciones: [],
    titulo: "Límites IGN",
    categoria: "Cartografía base",
  },
  "Predio urbano": {
    id: "prediosUrbanos",
    icono: "map",
    acciones: ["identificar", "descargar"],
    categoria: "Catastro urbano",
    extrasPorCapa: {
      lote: ["filtro", "buscar"],
      habilitacion_urbana: ["buscar"],
    },
  },
  "Área de circulación": {
    id: "areasCirulacion",
    icono: "minimize",
    acciones: ["identificar", "buscar", "descargar"],
    titulo: "Áreas de circulación",
    categoria: "Catastro urbano",
  },
  Reporte: {
    id: "reporteCapas",
    icono: "bar-chart-2",
    acciones: ["descargar", "filtro"],
    categoria: "Reporte",
  },
  SBN: {
    id: "interoperabilidad",
    icono: "repeat",
    acciones: ["identificar"],
    identificarDirecto: true,
    titulo: "SBN",
    categoria: "Interoperabilidad",
  },
};

export const CONFIG_BUSQUEDA_VIA_HAB = {
  habilitacion_urbana: {
    titulo: "Buscar habilitación urbana",
    etiqueta: "Ingrese el nombre de una habilitación urbana:",
    placeholder: "Ingresar nombre",
    campo: "nomb_hab_urb",
  },
  eje_via: {
    titulo: "Buscar una dirección",
    etiqueta: "Ingresar el nombre de la calle, avenida, jirón...",
    placeholder: "Ingresar nombre",
    campo: "nomb_via",
  },
};

// ── Helpers de tema ────────────────────────────────────────────────────────
// Fuente única de verdad para detectar el modo oscuro.
// Todos los módulos importan esta función en lugar de repetir
// document.documentElement.getAttribute("data-bs-theme") === "dark".
export function isDarkMode() {
  return document.documentElement.getAttribute("data-bs-theme") === "dark";
}

// ── Helpers de transformación de coordenadas ───────────────────────────────
// Las transformaciones más frecuentes: mapa (EPSG:3857) ↔ proyección display.
// Si proyeccionDisplay cambia en configuracion.js, todos los módulos lo heredan.
export function coordsToDisplay(c3857) {
  return proj4(proyeccion3857, proyeccionDisplay, c3857);
}

export function coordsToMap(cDisplay) {
  return proj4(proyeccionDisplay, proyeccion3857, cDisplay);
}

export function fechaHoy() {
  const fecha = new Date(),
    dia = String(fecha.getDate()).padStart(2, "0"),
    mes = String(fecha.getMonth() + 1).padStart(2, "0"),
    año = fecha.getFullYear();
  return dia + "" + mes + "" + año;
}

export function buscarCapaId(id) {
  const capas = global?.mapa?.getLayers?.()?.getArray?.();
  if (!Array.isArray(capas)) return null;

  return capas.find((layer) => layer.get("id") === id) || null;
}

export function mostrarToast(mensaje, color = "primary") {
  const toastEl = document.getElementById("toastNotificacion");
  const toastBody = toastEl.querySelector(".toast-body");
  const closeButton = toastEl.querySelector(".btn-close");

  const mapaColores = { error: "danger", blanco: "light" };
  const colorNormalizado = mapaColores[color] || color || "primary";

  const usaFondoClaro =
    colorNormalizado === "light" ||
    colorNormalizado === "warning" ||
    colorNormalizado === "info";
  const colorTexto = usaFondoClaro ? "text-dark" : "text-white";
  const claseCerrar = usaFondoClaro ? "btn-close" : "btn-close btn-close-white";

  toastBody.textContent = mensaje;
  toastEl.className = `toast align-items-center ${colorTexto} bg-${colorNormalizado} border-0 toast-visor`;
  if (closeButton) {
    closeButton.className = `${claseCerrar} me-2 m-auto`;
  }

  const toast = new bootstrap.Toast(toastEl);
  toast.show();
}

export function obtenerCookie(nombre) {
  const cookies = document.cookie ? document.cookie.split(";") : [];
  const prefijo = `${nombre}=`;

  for (const cookie of cookies) {
    const cookieLimpia = cookie.trim();
    if (cookieLimpia.startsWith(prefijo)) {
      return decodeURIComponent(cookieLimpia.substring(prefijo.length));
    }
  }

  return null;
}

export function obtenerTokenAcceso() {
  return obtenerCookie("access_geotoken");
}

export function construirHeadersConCsrf(headers = {}) {
  const csrfToken = obtenerCookie("csrf_access_token");
  const accessToken = obtenerTokenAcceso();
  const headersConToken = accessToken
    ? { ...headers, Authorization: `Bearer ${accessToken}` }
    : headers;
  if (csrfToken) {
    return { ...headersConToken, "X-CSRF-TOKEN": csrfToken };
  }

  return headersConToken;
}
