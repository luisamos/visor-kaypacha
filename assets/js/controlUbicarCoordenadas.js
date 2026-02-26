import proj4 from "proj4";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import {
  proyeccion32717,
  proyeccion32718,
  proyeccion32719,
  proyeccion4326,
  proyeccion3857,
  estiloMarcadorVerde,
} from "./configuracion";

const ubicarCoordenadas = document.getElementById("ubicarCoordenadas"),
  limpiarCoordenadas = document.getElementById("limpiarCoordenadas"),
  sistemaReferencia = document.getElementById("sistemaReferencia");
let marker = null;

function irMapa(x, y) {
  const coordenadas = [x, y];
  if (marker) {
    global.mapa.removeLayer(marker);
  }

  marker = new VectorLayer({
    source: new VectorSource({
      features: [
        new Feature({
          geometry: new Point(coordenadas),
        }),
      ],
    }),
    style: estiloMarcadorVerde,
  });

  global.mapa.addLayer(marker);
  global.vista.animate({
    center: coordenadas,
    duration: 1000,
  });
}

ubicarCoordenadas.addEventListener("click", () => {
  const x = parseFloat(document.getElementById("coordenadaX").value);
  const y = parseFloat(document.getElementById("coordenadaY").value);

  if (isNaN(x) || isNaN(y)) {
    mensaje(
      "mensajeUbicarCoordenadas",
      "Por favor, introduce valores válidos.",
      "danger"
    );
    return;
  }

  let coordenadasTransformada;
  switch (sistemaReferencia.value) {
    case "4326":
      coordenadasTransformada = proj4(proyeccion4326, proyeccion3857, [x, y]);
      break;
    case "32717":
      coordenadasTransformada = proj4(proyeccion32717, proyeccion3857, [x, y]);
      break;
    case "32718":
      coordenadasTransformada = proj4(proyeccion32718, proyeccion3857, [x, y]);
      break;
    case "32719":
      coordenadasTransformada = proj4(proyeccion32719, proyeccion3857, [x, y]);
      break;
  }
  irMapa(coordenadasTransformada[0], coordenadasTransformada[1]);
});

sistemaReferencia.addEventListener("change", () => {
  const valorSeleccionado = sistemaReferencia.value;
  if (valorSeleccionado === "4326") {
    document.getElementById("labelX").innerHTML = "Longitud";
    document.getElementById("labelY").innerHTML = "Latitud";
  } else {
    document.getElementById("labelX").innerHTML = "X";
    document.getElementById("labelY").innerHTML = "Y";
  }
  document.getElementById("coordenadaX").value = null;
  document.getElementById("coordenadaY").value = null;
});

limpiarCoordenadas.addEventListener("click", () => {
  document.getElementById("coordenadaX").value = "";
  document.getElementById("coordenadaY").value = "";
  if (marker) {
    global.mapa.removeLayer(marker);
    marker = null;
  }
});
