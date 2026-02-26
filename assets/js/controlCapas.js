import {
  colores,
  direccionServicioWFS,
  proyeccion3857,
  formatoGeoJson,
  formatoTexto,
  fechaHoy,
  buscarCapaId,
} from "./configuracion";
import { Tooltip } from "bootstrap";
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
  contenido = document.getElementById("popup-content");

const legendTooltip = legendButton
  ? Tooltip.getOrCreateInstance(legendButton)
  : null;

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
        document.getElementById("tipoColumna").value = "nume_doc";
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
      contenido.innerHTML = formatearContenidoPopup(data);
      global.cubrir.setPosition(e.coordinate);
    })
    .catch((error) => {
      console.error("Error al obtener GetFeatureInfo:", error);
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
  let tipoColumna = document.getElementById("tipoColumna").value,
    valorColumna = document.getElementById("valorColumna"),
    parametros = new URLSearchParams({
      SERVICE: "WFS",
      VERSION: "2.0.0",
      REQUEST: "GetFeature",
      TYPENAME: "lote",
      SRSNAME: proyeccion3857,
      FILTER: `<Filter><PropertyIsEqualTo><PropertyName>${tipoColumna}</PropertyName><Literal>${valorColumna.value}</Literal></PropertyIsEqualTo></Filter>`,
      OUTPUTFORMAT: formatoGeoJson,
    }),
    urlWFS = `${direccionServicioWFS}${parametros.toString()}`;

  if (valorColumna.value.length != 0) {
    try {
      fetch(urlWFS)
        .then((response) => response.json())
        .then((data) => {
          let totalRegistros = data.numberMatched;
          if (totalRegistros > 0) {
            data.features.forEach((f) => {
              const vectorSource = new VectorSource({
                features: new GeoJSON().readFeatures(f.geometry, {
                  featureProjection: proyeccion3857,
                }),
              });
              const vectorLayer = new VectorLayer({
                source: vectorSource,
                style: estilo,
                id: `${valorColumna.value}`,
              });
              global.mapa.getLayers().push(vectorLayer);
              const extension = vectorSource.getExtent();
              global.mapa
                .getView()
                .fit(extension, { duration: 1000, maxZoom: 19 });
            });
            mensajeBuscarLote.innerHTML = "";
            //buscarLote.setAttribute('data-bs-dismiss', 'modal');
            //buscarLote.click();
          } else {
            mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-danger alert-dismissible fade show" role="alert"><strong>Error!</strong> No se encontró ningun registro.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
            valorColumna.focus();
          }
        })
        .catch((error) =>
          console.log("Error al obtener los datos WFS:", error),
        );
    } catch (error) {
      console.error("Error WFS:", error);
    }
  } else {
    mensajeBuscarLote.innerHTML = `<div class="alert alert-sm alert-warning alert-dismissible fade show" role="alert"><strong>Error!</strong> Ingresar un campo.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button></div>`;
    valorColumna.focus();
  }
});
