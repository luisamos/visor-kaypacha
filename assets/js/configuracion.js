import * as bootstrap from "bootstrap";

import Style from "ol/style/Style";
import Icon from "ol/style/Icon";

import imagenVerde from "../images/ubicacionVerde.png";
import imgLogoMdw from "../images/logo-mdw.png";
import imgLogoMdwWhite from "../images/logo-mdw-white.png";
import imgProyectoCatastroMdw from "../images/proyecto-catastro-mdw.jpg";
import imgLogoMpc from "../images/logo-mpc.png";
import imgLogoMpcWhite from "../images/logo-mpc-white.png";
import imgProyectoCatastroMpc from "../images/proyecto-catastro-mpc.png";

const IS_DEV = false,
  UBIGEO = "080108";

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
  } = configuracionUbigeo;

global.activoInformacion;

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
  direccionServicioWMS = `${HOST}:${PORT}/servicio/wms?`,
  direccionServicioWFS = `${HOST}:${PORT}/servicio/wfs?`,
  //direccionServicioMapCache = `${HOST}:${PORT}/mapcache/?`, // Windows
  direccionServicioMapCache = `${HOST}:${PORT}/cgi-bin/mapcache/?`, //Linux
  direccionApiGIS = IS_DEV ? `${HOST}:5000/` : `${HOST}:${PORT}/api-gis/`,
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
        '<div class="legend-item"><i style="background:#adadad"></i> Eje de vía</div>',
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
                <div class="legend-item2"><i style="background:#000000"></i> P</div>
                <div class="legend-item2"><i style="background:#ff0000"></i> S</div>
                <div class="legend-item2"><i style="background:#ffff00"></i> G</div>
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

// ── Configuración centralizada de reportes ──────────────────────────────────
// Agregar un nuevo reporte: solo agregar un objeto a este array.
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
    chartType: "stacked", // gráfico apilado con/sin
    wmsFiltroParam: null, // usa params individuales: luz=1, agua=0...
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
