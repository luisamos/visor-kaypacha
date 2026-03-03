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
} from "./configuracion";
import { registrarCapaWmsDinamica } from "./capasGeograficas";

import { Modal, Tooltip } from "bootstrap";
import ImageWMS from "ol/source/ImageWMS";
import GeoJSON from "ol/format/GeoJSON";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { Style, Stroke } from "ol/style";

const legendDiv = document.getElementById("legenda"),
  legendButton = document.getElementById("leyenda"),
  legendButtonLabel = legendButton?.querySelector(".legend-label"),
  sidebarNav = document.getElementById("sidebarNav"),
  mensajeBuscarLote = document.getElementById("mensajeBuscarLote"),
  buscarLote = document.getElementById("buscarLote"),
  mensajeBuscarViaHab = document.getElementById("mensajeBuscarViaHab"),
  buscarViaHab = document.getElementById("buscarViaHab"),
  estilo = new Style({ stroke: new Stroke({ color: "red", width: 2 }) }),
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
  popupCloser = document.getElementById("popup-closer"),
  fotoLotePanel = document.getElementById("foto-lote-panel"),
  fotoLoteImg = document.getElementById("foto-lote-img"),
  fotoLoteCerrar = document.getElementById("foto-lote-cerrar"),
  popupTitle = document.querySelector("#popup .popup-title");

const legendTooltip = legendButton
  ? Tooltip.getOrCreateInstance(legendButton)
  : null;

const busquedaLoteModal = document.getElementById("busquedaLote"),
  busquedaViaHabModal = document.getElementById("busquedaViaHab");

let capaBusquedaLotes = null,
  lotesBusquedaActual = [],
  viasBusquedaActual = [];

const CAPAS_BASE = [
  { id: "ortofoto", titulo: "Ortofoto", checked: false },
  { id: "googleMapCalle", titulo: "Google calles", checked: false },
  { id: "googleMapSatelite", titulo: "Google satélite", checked: true },
  { id: "osm", titulo: "Open Street Map", checked: false },
  { id: "esriModoNoche", titulo: "Esri modo noche", checked: false },
];

const DEFINICION_GRUPOS_WMS = {
  "Límite censal": {
    id: "limitesCensales",
    icono: "activity",
    acciones: [],
    categoria: "Cartografía base",
  },
  "Predio urbano": {
    id: "prediosUrbanos",
    icono: "map",
    acciones: ["identificar", "descargar"],
    categoria: "Catastro urbano",
    extrasPorCapa: {
      lote: ["filtro", "buscar"],
      habilitacion_urbana: ["filtro", "buscar"],
    },
  },
  "Área de circulación": {
    id: "areasCirulacion",
    icono: "minimize",
    acciones: ["identificar", "buscar", "filtro", "descargar"],
    titulo: "Áreas de circulación",
    categoria: "Catastro urbano",
  },
  Reporte: {
    id: "reporteCapas",
    icono: "bar-chart-2",
    acciones: ["filtro"],
    filtroSolo: true,
    categoria: "Reporte",
  },
  Interoperabilidad: {
    id: "interoperabilidad",
    icono: "repeat",
    acciones: ["identificar"],
    identificarDirecto: true,
    categoria: "Interoperabilidad",
  },
};

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
  const filaIdLote = filas.find((fila) => {
    const etiqueta = fila.querySelector(".popup-lote-label")?.textContent ?? "";
    return etiqueta.trim().toLowerCase() === "id lote";
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
    "01": "No presentó documentos",
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
  if (!capaBusquedaLotes) return;
  global.mapa.removeLayer(capaBusquedaLotes);
  capaBusquedaLotes = null;
}

function enfocarLoteBusqueda(indice) {
  const loteSeleccionado = lotesBusquedaActual[indice];
  if (!loteSeleccionado) return;

  limpiarCapaBusquedaLotes();

  const vectorSource = new VectorSource({
    features: new GeoJSON().readFeatures(loteSeleccionado, {
      featureProjection: proyeccion3857,
      dataProjection: "EPSG:4326",
    }),
  });

  capaBusquedaLotes = new VectorLayer({
    source: vectorSource,
    style: estilo,
    id: `busqueda-lote-${indice}`,
  });

  global.mapa.addLayer(capaBusquedaLotes);
  global.mapa.getView().fit(vectorSource.getExtent(), {
    duration: 1000,
    maxZoom: 19,
    padding: [20, 20, 20, 20],
  });
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
        ? `<a href="${rutaFotografia}/${fotoLote}" target="_blank" rel="noopener noreferrer">Ver</a>`
        : "-";

      return `<tr>
        <td>${propiedades.id_lote || "-"}</td>
        <td>${propiedades.a_grafi || "-"}</td>
        <td>${propiedades.a_verifi || "-"}</td>
        <td>${foto}</td>
        <td>
          <button type="button" class="btn btn-sm btn-primary" data-indice-lote="${index}" title="Acercarse" aria-label="Acercarse">
            <i class="icon feather icon-search"></i>
          </button>
        </td>
      </tr>`;
    })
    .join("");

  listadoLotePanel.classList.remove("d-none");
}

function renderizarListadoVias(resultados) {
  ocultarListadoLotes();
  if (!listadoViasBody || !listadoViasPanel) return;

  if (!resultados.length) {
    ocultarListadoVias();
    return;
  }

  viasBusquedaActual = resultados;

  listadoViasBody.innerHTML = resultados
    .map(({ tipo, nombre, feature }, index) => {
      const etiqueta =
        tipo === "habilitacion_urbana" ? "Habilitación urbana" : "Eje de vía";
      const nombreResultado = nombre || feature?.id || "-";

      return `<tr>
        <td>${etiqueta}</td>
        <td>${nombreResultado}</td>
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

  capaBusquedaLotes = new VectorLayer({
    source: vectorSource,
    style: estilo,
    id: `busqueda-via-${indice}`,
  });

  global.mapa.addLayer(capaBusquedaLotes);
  global.mapa.getView().fit(vectorSource.getExtent(), {
    duration: 1000,
    maxZoom: 19,
    padding: [20, 20, 20, 20],
  });
}

function buscarEnCapaWfs(tipoCapa, campo, valorBusqueda) {
  const parametros = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAME: tipoCapa,
    SRSNAME: proyeccion3857,
    FILTER: `<Filter><PropertyIsLike wildCard="*" singleChar="." escapeChar="!"><PropertyName>${campo}</PropertyName><Literal>*${valorBusqueda}*</Literal></PropertyIsLike></Filter>`,
    OUTPUTFORMAT: formatoGeoJson,
  });

  return fetch(`${direccionServicioWFS}${parametros.toString()}`)
    .then((response) => response.json())
    .then((data) => {
      const features = Array.isArray(data?.features) ? data.features : [];
      return features.map((feature) => ({
        tipo: tipoCapa,
        nombre: feature?.properties?.[campo] || "",
        feature,
      }));
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
    const labelsLote = [
      "ID lote",
      "CUC",
      "Código de sector",
      "Código de manzana",
      "Código de lote",
      "Área gráfica",
      "Área verificada",
      "Fotografía",
      "Ver detalles",
    ];
    const autenticado = document.body.classList.contains("usuario-autenticado");
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");
    const tabla = doc.querySelector("table");

    const crearContenedorFilas = () => {
      const contenedor = document.createElement("div");
      contenedor.classList.add("popup-lote-vertical");
      return contenedor;
    };

    const agregarFilaNormalizada = (contenedor, etiquetaHtml, valorHtml) => {
      const filaDato = document.createElement("div");
      filaDato.classList.add("popup-lote-row");

      const etiqueta = document.createElement("span");
      etiqueta.classList.add("popup-lote-label");
      etiqueta.textContent =
        (etiquetaHtml || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim() || "-";

      const valor = document.createElement("span");
      valor.classList.add("popup-lote-value");
      valor.innerHTML = (valorHtml || "").trim() || "-";

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

      const esTablaLote = filas.some(
        (fila) => fila.querySelectorAll("td").length >= labelsLote.length,
      );

      if (esTablaLote) {
        const contenedorVertical = crearContenedorFilas();

        filas.forEach((fila) => {
          const celdas = Array.from(fila.querySelectorAll("td"));
          if (!celdas.length) return;

          celdas.forEach((celda, indice) => {
            if (!labelsLote[indice]) return;
            if (indice === 8 && !autenticado) return;

            const valorHtml = celda.innerHTML.trim();
            const valorTmp = document.createElement("span");
            valorTmp.innerHTML = valorHtml;

            const esEnlaceDetalles =
              indice === 8 &&
              valorTmp
                .querySelector('a[href="#"]')
                ?.textContent?.trim()
                .toLowerCase()
                .includes("detalles");

            if (esEnlaceDetalles && !autenticado) return;

            agregarFilaNormalizada(
              contenedorVertical,
              labelsLote[indice],
              valorHtml,
            );
          });
        });

        if (contenedorVertical.childElementCount > 0) {
          return contenedorVertical.outerHTML;
        }
      }

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

function construirAccion({ accion, id, nombreWms }) {
  const esBusquedaViaHab = ["habilitacion_urbana", "eje_via"].includes(id);
  const mapaAccion = {
    identificar: {
      icono: "info",
      texto: "Identificar",
      dataName: `i${id}`,
    },
    descargar: {
      icono: "download",
      texto: "Descargar shp.",
      dataName: `d${nombreWms}`,
    },
    filtro: {
      icono: "filter",
      texto: "Filtro",
      dataName: `f${id}`,
      modal: "#filtroLote",
    },
    buscar: {
      icono: "search",
      texto: "Buscar",
      dataName:
        id === "lote" ? "blote" : esBusquedaViaHab ? "bViaHab" : `b${id}`,
      modal: esBusquedaViaHab ? "#busquedaViaHab" : "#busquedaLote",
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
        const acciones = [...new Set([...accionesBase, ...extras])];
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
  if (window.feather?.replace) window.feather.replace();
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

function procesarAccionCapa(nombre) {
  if (!nombre) return;
  if (nombre.substring(0, 1) === "i") {
    global.activoInformacion = nombre.substring(1);
  } else if (nombre === "blote") {
    document.getElementById("tipoColumna").value = "id_lote";
    document.getElementById("valorColumna").value = "";
    mensajeBuscarLote.innerHTML = "";
  } else if (nombre === "bViaHab") {
    const valorViaHab = document.getElementById("valorViaHab");
    if (valorViaHab) {
      valorViaHab.value = "";
    }
    if (mensajeBuscarViaHab) {
      mensajeBuscarViaHab.innerHTML = "";
    }
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

  console.log(url);
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

buscarLote.addEventListener("click", function () {
  const tipoColumna = document.getElementById("tipoColumna").value;
  const valorColumna = document.getElementById("valorColumna");
  const valorBusqueda = valorColumna.value.trim();

  if (!valorBusqueda.length) {
    mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    valorColumna.focus();
    return;
  }

  const parametros = new URLSearchParams({
    SERVICE: "WFS",
    VERSION: "2.0.0",
    REQUEST: "GetFeature",
    TYPENAME: "lote",
    SRSNAME: proyeccion3857,
    FILTER: `<Filter><PropertyIsLike wildCard="*" singleChar="." escapeChar="!"><PropertyName>${tipoColumna}</PropertyName><Literal>*${valorBusqueda}*</Literal></PropertyIsLike></Filter>`,
    OUTPUTFORMAT: formatoGeoJson,
  });

  const urlWFS = `${direccionServicioWFS}${parametros.toString()}`;

  fetch(urlWFS)
    .then((response) => response.json())
    .then((data) => {
      const totalRegistros = data.numberMatched || data.features?.length || 0;
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
        valorColumna.focus();
      }
    })
    .catch((error) => {
      console.log("Error al obtener los datos WFS:", error);
      mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se pudo realizar la consulta.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    });
});

buscarViaHab?.addEventListener("click", function () {
  const valorViaHab = document.getElementById("valorViaHab");
  const valorBusqueda = valorViaHab?.value.trim() || "";

  if (!valorBusqueda.length) {
    mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    valorViaHab?.focus();
    return;
  }

  Promise.all([
    buscarEnCapaWfs("habilitacion_urbana", "nomb_hab_urb", valorBusqueda),
    buscarEnCapaWfs("eje_via", "nomb_via", valorBusqueda),
  ])
    .then(([habilitaciones, vias]) => {
      const resultados = [...habilitaciones, ...vias];

      if (resultados.length > 0) {
        ocultarDetalleLote();
        mensajeBuscarViaHab.innerHTML = "";
        renderizarListadoVias(resultados);
        if (busquedaViaHabModal) {
          Modal.getOrCreateInstance(busquedaViaHabModal).hide();
        }
      } else {
        limpiarCapaBusquedaLotes();
        ocultarListadoVias();
        mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
        valorViaHab?.focus();
      }
    })
    .catch((error) => {
      console.log(
        "Error al obtener los datos WFS de vías y habilitaciones:",
        error,
      );
      mensajeBuscarViaHab.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se pudo realizar la consulta.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    });
});

listadoLoteBody?.addEventListener("click", (event) => {
  const botonAcercarse = event.target.closest("button[data-indice-lote]");
  if (!botonAcercarse) return;

  const indice = Number(botonAcercarse.dataset.indiceLote);
  enfocarLoteBusqueda(indice);
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
