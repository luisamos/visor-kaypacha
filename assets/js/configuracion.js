import * as bootstrap from "bootstrap";

import Style from "ol/style/Style";
import Icon from "ol/style/Icon";
import imagenVerde from "../images/ubicacionVerde.png";

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
      logo_light: "./assets/images/logo-mdw.png",
      logo_dark: "./assets/images/logo-mdw-white.png",
      logo_container: "./assets/images/proyecto-catastro-mdw.jpg",
      ficha_individual:
        "https://catastro.muniwanchaq.gob.pe:9100/pdf/individual/",
      ruta_fotografia:
        "https://catastro.muniwanchaq.gob.pe:9100/storage/img/imageneslotes/",
      ortofotos: "ortofoto",
    },
    "080601": {
      HOST: IS_DEV ? "http://127.0.0.3" : "http://10.0.10.66",
      PORT: IS_DEV ? "80" : "8081",
      xy: [-7929226.8315, -1604831.885],
      zoom: 13,
      titulo: "Municipalidad Provincial de Canchis",
      siglas: "MPC",
      logo_light: "./assets/images/logo-mpc.png",
      logo_dark: "./assets/images/logo-mpc.png",
      logo_container: "./assets/images/proyecto-catastro-mpc.png",
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
  direccionServicioMapCache = `${HOST}:${PORT}/mapcache/?`,
  //direccionServicioMapCache = `${HOST}:${PORT}/cgi-bin/mapcache/?`, --Linux
  direccionApiGIS = `${HOST}:5000/`,
  formatoPNG = "image/png",
  formatoJPEG = "image/jpeg",
  formatoJson = "application/json",
  formatoGeoJson = "geojson",
  formatoTexto = "text/html",
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
      id: "habilitacionUrbana",
      texto:
        '<div class="legend-item"><i style="background:#0000ff"></i> Habilitación Urbana</div>',
    },
    {
      id: "servicioBasico",
      texto: `<div class="legend-item"><strong>Servicio básico</strong></div>
        <div class="legend-item2"><i style="background:#00aae4"></i> Luz</div>
        <div class="legend-item2"><i style="background:#6ae1ff"></i> Agua</div>
        <div class="legend-item2"><i style="background:#593cc5"></i> Desague</div>
        <div class="legend-item2"><i style="background:#eeeec4"></i> Gas</div>
        <div class="legend-item2"><i style="background:#efeeff"></i> Internet</div>
        <div class="legend-item2"><i style="background:#ff9d44"></i> TvCable</div>
        <div class="legend-item"></div>`,
    },
    {
      id: "clasificacionPredio",
      texto: `<div class="legend-item"><strong>Clasificación de Predio</strong></div>
        <div class="legend-item2"><i style="background:#073763"></i> Casa - Habitación</div>
        <div class="legend-item2"><i style="background:#0b5394"></i> Tienda - Depósito - Almacen</div>
        <div class="legend-item2"><i style="background:#3d85c6"></i> Predio en edificación</div>
        <div class="legend-item2"><i style="background:#9fc5e8"></i> Terreno sin construcción</div>
        <div class="legend-item2"><i style="background:#6fa8dc"></i> Otros</div>
        <div class="legend-item"></div>`,
    },
    {
      id: "tipoPersona",
      texto: `<div class="legend-item"><strong>Tipo de persona</strong></div>
            <div class="legend-item2"><i style="background:#3bc500"></i> Persona natural</div>
            <div class="legend-item2"><i style="background:#005700"></i> Persona jurídica</div>
            <div class="legend-item"></div>`,
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
      id: "parque",
      texto:
        '<div class="legend-item"><i style="background:#00FF3F"></i> Parque</div>',
    },
    {
      id: "ejeVia",
      texto:
        '<div class="legend-item"><i style="background:#adadad"></i> Eje de vía</div>',
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

export function fechaHoy() {
  const fecha = new Date(),
    dia = String(fecha.getDate()).padStart(2, "0"),
    mes = String(fecha.getMonth() + 1).padStart(2, "0"),
    año = fecha.getFullYear();
  return dia + "" + mes + "" + año;
}

export function buscarCapaId(id) {
  return (
    global.mapa
      .getLayers()
      .getArray()
      .find((layer) => layer.get("id") === id) || null
  );
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
