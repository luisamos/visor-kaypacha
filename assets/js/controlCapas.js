import {
  colores,
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

import { Modal, Tooltip } from "bootstrap";
import ImageWMS from "ol/source/ImageWMS";
import GeoJSON from "ol/format/GeoJSON";
import { Vector as VectorSource } from "ol/source";
import { Vector as VectorLayer } from "ol/layer";
import { Style, Stroke } from "ol/style";

const legendDiv = document.getElementById("legenda"),
  legendButton = document.getElementById("leyenda"),
  legendButtonLabel = legendButton?.querySelector(".legend-label"),
  dropdownItems = document.querySelectorAll(".dropdown-item"),
  checkboxes = document.querySelectorAll(".form-check-input"),
  mensajeBuscarLote = document.getElementById("mensajeBuscarLote"),
  buscarLote = document.getElementById("buscarLote"),
  estilo = new Style({ stroke: new Stroke({ color: "red", width: 2 }) }),
  contenido = document.getElementById("popup-content"),
  detalleLotePanel = document.getElementById("detalle-lote-panel"),
  detalleLoteBody = document.getElementById("detalle-lote-body"),
  detalleLoteCerrar = document.getElementById("detalle-lote-cerrar"),
  listadoLotePanel = document.getElementById("listado-lote-panel"),
  listadoLoteBody = document.getElementById("listado-lote-body"),
  listadoLoteCerrar = document.getElementById("listado-lote-cerrar"),
  popupCloser = document.getElementById("popup-closer");

const legendTooltip = legendButton
  ? Tooltip.getOrCreateInstance(legendButton)
  : null;

const busquedaLoteModal = document.getElementById("busquedaLote");

let capaBusquedaLotes = null;
let lotesBusquedaActual = [];

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

function ocultarListadoLotes() {
  if (listadoLoteBody) {
    listadoLoteBody.innerHTML = "";
  }
  lotesBusquedaActual = [];
  listadoLotePanel?.classList.add("d-none");
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

function renderizarDetalleLote(respuesta) {
  ocultarListadoLotes();
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

    if (tabla) {
      const filas = Array.from(tabla.querySelectorAll("tbody tr, tr")).filter(
        (fila) => fila.querySelectorAll("td").length,
      );

      const esTablaLote = filas.some(
        (fila) => fila.querySelectorAll("td").length >= labelsLote.length,
      );

      if (esTablaLote) {
        const contenedorVertical = document.createElement("div");
        contenedorVertical.classList.add("popup-lote-vertical");

        filas.forEach((fila) => {
          const celdas = Array.from(fila.querySelectorAll("td"));
          if (!celdas.length) return;

          const item = document.createElement("article");
          item.classList.add("popup-lote-item");

          celdas.forEach((celda, indice) => {
            if (!labelsLote[indice]) return;
            if (indice === 8 && !autenticado) return;

            const filaDato = document.createElement("div");
            filaDato.classList.add("popup-lote-row");

            const etiqueta = document.createElement("span");
            etiqueta.classList.add("popup-lote-label");
            etiqueta.textContent = labelsLote[indice];

            const valor = document.createElement("span");
            valor.classList.add("popup-lote-value");
            valor.innerHTML = celda.innerHTML.trim() || "-";

            const esEnlaceDetalles =
              indice === 8 &&
              valor
                .querySelector('a[href="#"]')
                ?.textContent?.trim()
                .toLowerCase()
                .includes("detalles");

            if (esEnlaceDetalles && !autenticado) return;

            filaDato.appendChild(etiqueta);
            filaDato.appendChild(valor);
            item.appendChild(filaDato);
          });

          if (item.childElementCount > 0) {
            contenedorVertical.appendChild(item);
          }
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

function activarBoton(id, estado) {
  const button = document.getElementById("btn" + id);
  if (estado) button.style.display = "";
  else button.style.display = "none";
}

legendButton?.addEventListener("click", () => {
  const visible = legendDiv.style.display !== "none";
  actualizarLeyendaVisible(!visible);
  legendTooltip?.hide();
});

document.getElementById("capasBase").addEventListener("click", function (e) {
  if (e.target && e.target.type === "radio") {
    const id = e.target.id;
    if (id === "osm") {
      global.osm.setVisible(true);
      global.ortofoto.setVisible(false);
      global.googleSatelite.setVisible(false);
      global.googleCalles.setVisible(false);
    } else if (id === "ortofoto") {
      global.osm.setVisible(false);
      global.ortofoto.setVisible(true);
      global.googleSatelite.setVisible(false);
      global.googleCalles.setVisible(false);
    } else if (id === "googleMapSatelite") {
      global.osm.setVisible(false);
      global.ortofoto.setVisible(false);
      global.googleSatelite.setVisible(true);
      global.googleCalles.setVisible(false);
    } else if (id === "googleMapCalle") {
      global.osm.setVisible(false);
      global.ortofoto.setVisible(false);
      global.googleSatelite.setVisible(false);
      global.googleCalles.setVisible(true);
    }
  }
});

checkboxes.forEach((checkbox) => {
  checkbox.addEventListener("click", function () {
    if (this.id !== "conFichaLote" && this.id !== "sinFichaLote") {
      const capaTematica = buscarCapaId(this.id);
      if (
        capaTematica != null &&
        this.id !== "habilitacionUrbana" &&
        this.id !== "puerta" &&
        this.id !== "parque"
      ) {
        activarBoton(this.id, this.checked);
      }
      capaTematica.setVisible(this.checked);
      actualizarLeyenda();
    }
  });
});

dropdownItems.forEach((item) => {
  item.addEventListener("click", function (event) {
    event.preventDefault();
    if (item.getAttribute("data-name") !== null) {
      const nombre = item.getAttribute("data-name").toString();
      if (nombre.substring(0, 1) === "i") {
        global.activoInformacion = nombre.substring(1);
      } else if (nombre === "blote") {
        document.getElementById("tipoColumna").value = "id_lote";
        document.getElementById("valorColumna").value = "";
        mensajeBuscarLote.innerHTML = "";
        //buscarLote.setAttribute('data-bs-dismiss', '');
      } else if (nombre.substring(0, 1) === "d") {
        const url =
          direccionServicioWFS +
          "service=WFS&request=GetFeature&VERSION=1.1.0&outputFormat=SHAPE-ZIP&typeName=" +
          nombre.substring(1);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${nombre.substring(1)}_${fechaHoy()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  });
});

detalleLoteCerrar?.addEventListener("click", () => {
  ocultarDetalleLote();
});

listadoLoteCerrar?.addEventListener("click", () => {
  ocultarListadoLotes();
});

contenido?.addEventListener("click", (event) => {
  const enlace = event.target.closest("a");
  if (!enlace) return;

  const texto = enlace.textContent?.trim().toLowerCase() || "";
  if (enlace.getAttribute("href") === "#" || texto === "ver") {
    event.preventDefault();
    cargarDetalleLoteDesdePopup();
  }
});

popupCloser?.addEventListener("click", () => {
  ocultarDetalleLote();
  ocultarListadoLotes();
});

document.addEventListener("estado-autenticacion", (event) => {
  if (!event.detail?.autenticado) {
    ocultarDetalleLote();
    ocultarListadoLotes();
  }
});

export function obtenerInformacion(e) {
  const coordenadas = e.coordinate;
  const resolucionVista = /** @type {number} */ (global.vista.getResolution());
  const capaActivaId = global.activoInformacion;

  if (!capaActivaId) return;

  const capaActiva = buscarCapaId(capaActivaId);
  if (!capaActiva || !capaActiva.getVisible()) return;

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
      contenido.innerHTML = formatearContenidoPopup(data);
      global.cubrir.setPosition(e.coordinate);
    })
    .catch((error) => {
      console.error("Error al obtener GetFeatureInfo:", error);
      ocultarDetalleLote();
      ocultarListadoLotes();
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
        mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
        valorColumna.focus();
      }
    })
    .catch((error) => {
      console.log("Error al obtener los datos WFS:", error);
      mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se pudo realizar la consulta.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    });
});

listadoLoteBody?.addEventListener("click", (event) => {
  const botonAcercarse = event.target.closest("button[data-indice-lote]");
  if (!botonAcercarse) return;

  const indice = Number(botonAcercarse.dataset.indiceLote);
  enfocarLoteBusqueda(indice);
});
