import { combine, parseShp, parseDbf } from "shpjs";
import JSZip from "jszip";
import {
  direccionApiGIS,
  mostrarToast,
  construirHeadersConCsrf,
} from "../core/configuracion";
import { resetDropify } from "./controlDropify";

// Descomprime el .zip con JSZip (robusto y ya disponible en el proyecto) y
// reconstruye el/los shapefile con shpjs. Reemplaza el descompresor interno de
// shpjs (but-unzip), que fallaba ("but-unzip~2": no encontraba el End Of Central
// Directory) en zips válidos con comentario u otras variaciones.
function errorArchivoInvalido(mensaje) {
  const error = new Error(mensaje);
  error.esArchivoInvalido = true; // mensaje apto para mostrar al usuario
  return error;
}

async function leerShapefileDesdeZip(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw errorArchivoInvalido("El archivo está vacío o no se pudo leer.");
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (e) {
    throw errorArchivoInvalido(
      "El archivo no es un .zip válido o está dañado.",
    );
  }

  const porCapa = {};
  const lecturas = [];

  zip.forEach((rutaRelativa, entrada) => {
    if (entrada.dir || rutaRelativa.indexOf("__MACOSX") !== -1) return;
    const coincidencia = rutaRelativa.match(/^(.*)\.(shp|dbf|prj|cpg)$/i);
    if (!coincidencia) return;

    const base = coincidencia[1];
    const extension = coincidencia[2].toLowerCase();
    const comoTexto = extension === "prj" || extension === "cpg";

    lecturas.push(
      entrada
        .async(comoTexto ? "string" : "uint8array")
        .then((contenido) => {
          (porCapa[base] = porCapa[base] || {})[extension] = contenido;
        }),
    );
  });

  await Promise.all(lecturas);

  const capas = Object.keys(porCapa)
    .filter((base) => porCapa[base].shp)
    .map((base) => {
      const { shp, dbf, prj, cpg } = porCapa[base];
      return combine([parseShp(shp, prj), dbf ? parseDbf(dbf, cpg) : []]);
    });

  if (!capas.length) {
    throw errorArchivoInvalido(
      "El archivo .zip no contiene un shapefile (.shp).",
    );
  }

  return capas.length === 1 ? capas[0] : capas;
}

const configuracionCapas = {
  Sector: {
    campos: [{ id: "cod_sector", label: "COD_SECTOR" }],
    totalResumenKey: "totalRegistros",
  },
  Manzana: {
    campos: [
      { id: "cod_sector", label: "COD_SECTOR" },
      { id: "cod_mzna", label: "COD_MZNA" },
    ],
    totalResumenKey: "totalRegistros",
  },
  Lote: {
    campos: [
      { id: "cod_sector", label: "COD_SECTOR" },
      { id: "cod_mzna", label: "COD_MZNA" },
      { id: "cod_lote", label: "COD_LOTE" },
      { id: "cuc", label: "CUC", required: false },
    ],
    totalResumenKey: "totalLotes",
  },
  EjeVia: {
    campos: [
      { id: "cod_sector", label: "COD_SECTOR", required: true },
      { id: "cod_via", label: "COD_VIA" },
      { id: "nomb_via", label: "NOMB_VIA" },
    ],
  },
  HabilitacionUrbana: {
    campos: [
      { id: "cod_hab_urb", label: "COD_HAB_URB" },
      { id: "tipo_hab_urb", label: "TIPO_HAB_URB", required: false },
      { id: "nomb_hab_urb", label: "NOMB_HAB_URB" },
    ],
  },
  Comercio: {
    campos: [
      { id: "cod_piso", label: "COD_PISO" },
      { id: "cod_lote", label: "COD_LOTE" },
      { id: "id_uni_cat", label: "ID_UNI_CAT" },
    ],
  },
  Construccion: {
    campos: [
      { id: "cod_piso", label: "COD_PISO" },
      { id: "id_lote", label: "ID_LOTE", required: true },
    ],
  },
  Parque: {
    campos: [
      { id: "cod_parque", label: "COD_PARQUE" },
      { id: "id_lote", label: "ID_LOTE" },
      { id: "nomb_parque", label: "NOMB_PARQUE", required: false },
    ],
  },
  Puerta: {
    campos: [
      { id: "cod_puerta", label: "COD_PUERTA" },
      { id: "id_lote", label: "ID_LOTE", required: false },
      { id: "esta_puerta", label: "ESTA_PUERTA", required: false },
    ],
  },
};

const tablaPorDefecto = Object.keys(configuracionCapas)[0];

// Configuración del sondeo del progreso de carga en segundo plano.
// Centralizada aquí para ajustar el ritmo sin tocar la lógica.
const SONDEO_CARGA = {
  intervaloMs: 1200, // tiempo entre consultas de estado
  maxIntentos: 600, // tope de seguridad (~12 min) para no sondear indefinidamente
};

// Estados que devuelve el backend para un trabajo de importación.
const ESTADO_TRABAJO = {
  PROCESANDO: "procesando",
  COMPLETADO: "completado",
  ERROR: "error",
};

const columnasExcluidas = [
  "fid",
  "id",
  "objectid",
  "globalid",
  "shape__are",
  "shape__len",
];
const archivoZip = document.getElementById("archivoZip");
const btnCargarArchivoZip = document.getElementById("btnCargarArchivoZip");
const columnasArchivoShape = document.getElementById("columnasArchivoShape");
const tablasGeograficas = document.getElementById("tablasGeograficas");
const btnConfirmarCarga = document.getElementById("btnConfirmarCarga");
const resultadoValidacion = document.getElementById("resultadoValidacion");
const btnLimpiarArchivo = document.getElementById("limpiarArchivo");
const manualCamposTabla = document.getElementById("manualCamposTabla");

let nombreCarpetaActual = null;

let ultimoPayloadValidacion = null;
let validacionEnCurso = false;

function construirListadoErrores(errores) {
  if (!errores || typeof errores !== "object") return "";

  const items = Object.entries(errores)
    .map(([campo, detalle]) => {
      const mensaje =
        typeof detalle === "string"
          ? detalle
          : detalle?.mensaje || "Error desconocido";
      const ids = Array.isArray(detalle?.id) ? detalle.id.join(", ") : null;
      const idsTexto = ids
        ? `<div class="small text-muted">IDs: ${ids}</div>`
        : "";
      return `<li><strong>${campo}:</strong> ${mensaje}${idsTexto}</li>`;
    })
    .join("");

  return items ? `<ul class="mb-0 ps-3">${items}</ul>` : "";
}

function construirTablaReporteErrores(reporte = []) {
  if (!Array.isArray(reporte) || !reporte.length) return "";

  const keysReporte = Object.keys(reporte[0]);
  const encabezados = keysReporte
    .map((key) => `<th class="text-uppercase">${key}</th>`)
    .join("");

  const filas = reporte
    .map((item) => {
      const celdas = keysReporte
        .map((key) => `<td>${item[key] ?? "-"}</td>`)
        .join("");
      return `<tr>${celdas}</tr>`;
    })
    .join("");

  return `
    <div class="table-responsive mt-2">
      <table class="table table-sm mb-0">
        <thead><tr>${encabezados}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function mostrarDetalleErrores({
  contenedor,
  mensaje,
  errores,
  reporte,
  tipo = "danger",
}) {
  if (!contenedor) return;

  const listaErrores = construirListadoErrores(errores);
  const tablaReporte = construirTablaReporteErrores(reporte);

  const contenido = `
    <div class="alert alert-${tipo}">
      <div class="fw-semibold mb-1">${mensaje}</div>
      ${
        listaErrores || '<div class="mb-0">No se proporcionaron detalles.</div>'
      }
    </div>
    ${tablaReporte}
  `;

  contenedor.innerHTML = contenido;
}

async function procesarRespuestaApi(
  response,
  { accion, contenedor, mostrarReporte = false, mensajeExito },
) {
  let data = null;
  try {
    data = await response.json();
  } catch (e) {
    console.error("No se pudo parsear la respuesta:", e);
  }

  const exito = response.ok && data?.estado !== false;

  if (exito) {
    if (mensajeExito) mostrarToast(mensajeExito(data), "success");
    return data;
  }

  const mensajeError =
    data?.mensaje ||
    `Error al ${accion}${response.status ? ` (${response.status})` : ""}`;

  mostrarToast(`❌ ${mensajeError}`, "danger");
  mostrarDetalleErrores({
    contenedor,
    mensaje: mensajeError,
    errores: data?.errores,
    reporte: mostrarReporte ? data?.reporte : null,
  });

  return null;
}

btnCargarArchivoZip.addEventListener("click", async () => {
  const file = archivoZip.files[0];
  if (!file) {
    mostrarToast("Por favor selecciona un archivo .zip", "error");
    return;
  }

  if (file.size === 0) {
    mostrarToast(
      "El archivo está vacío (0 KB). Selecciona un .zip válido.",
      "warning",
    );
    return;
  }

  const configActual = configuracionCapas[tablasGeograficas.value];
  if (!configActual) {
    mostrarToast(
      "La capa seleccionada no está configurada para carga masiva.",
      "warning",
    );
    return;
  }
  btnCargarArchivoZip.disabled = true;
  nombreCarpetaActual = null;
  ultimoPayloadValidacion = null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const geojson = await leerShapefileDesdeZip(arrayBuffer);
    // Puede ser una FeatureCollection o un array de ellas (zip multicapa).
    const featureCollection = Array.isArray(geojson) ? geojson[0] : geojson;
    const properties = featureCollection?.features?.[0]?.properties;

    if (!properties) {
      mostrarToast("No se encontraron propiedades en el shapefile.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tabla", tablasGeograficas.value);

    const response = await fetch(`${direccionApiGIS}subir_shapefile`, {
      method: "POST",
      body: formData,
      headers: construirHeadersConCsrf(),
      credentials: "include",
    });

    const data = await procesarRespuestaApi(response, {
      accion: "subir el shapefile",
      contenedor: resultadoValidacion,
      mensajeExito: (info) => `✅ ${info.mensaje}`,
    });

    if (!data) {
      nombreCarpetaActual = null;
      return;
    }

    nombreCarpetaActual = data.nombreCarpeta;

    mostrarCampos(Object.keys(properties));
    resultadoValidacion.innerHTML =
      '<div class="alert alert-secondary">Selecciona las columnas para validar el shapefile.</div>';
    archivoZip.disabled = true;
    tablasGeograficas.disabled = true;
    btnCargarArchivoZip.style.display = "none";

    const selects = columnasArchivoShape.querySelectorAll(
      'select[name^="map_"]',
    );
    if (!selects.length) {
      const { payload } = construirPayloadValidacion();
      const payloadJson = JSON.stringify(payload);
      await ejecutarValidacion(payload, payloadJson);
    }
  } catch (error) {
    console.error("Error:", error);
    mostrarToast(
      error?.esArchivoInvalido
        ? error.message
        : "Error al procesar o subir el shapefile",
      "danger",
    );
    nombreCarpetaActual = null;
  } finally {
    btnCargarArchivoZip.disabled = false;
  }
});

function mostrarCampos(columnas) {
  const columnasFiltradas = columnas.filter(
    (col) => !columnasExcluidas.includes(col.toLowerCase()),
  );

  const configActual = configuracionCapas[tablasGeograficas.value];
  const camposFijos = configActual?.campos ?? [];

  columnasArchivoShape.innerHTML = "";
  resultadoValidacion.innerHTML = "";
  btnConfirmarCarga.style.display = "none";

  camposFijos.forEach((campo) => {
    const row = document.createElement("div");
    row.className = "row mb-2 align-items-center";

    const labelCampo =
      campo.required === false ? `${campo.label} (opcional)` : campo.label;

    const opciones = columnasFiltradas
      .map((col) => {
        const seleccionado = col.toLowerCase() === campo.id.toLowerCase();
        const atributoSelected = seleccionado ? " selected" : "";
        return `<option value="${col}"${atributoSelected}>${col}</option>`;
      })
      .join("");

    row.innerHTML = `
        <div class="col-md-6">
            <input type="text" class="form-control" value="${labelCampo}" readonly>
        </div>
        <div class="col-md-6">
            <select class="form-select" name="map_${campo.id}" data-required="${
              campo.required !== false
            }">
            <option value="">[Elegir]</option>
            ${opciones}
            </select>
        </div>
        `;

    columnasArchivoShape.appendChild(row);
  });

  const selects = columnasArchivoShape.querySelectorAll('select[name^="map_"]');
  const todosSeleccionados =
    selects.length > 0 &&
    Array.from(selects).every((select) => {
      const requerido = select.dataset.required !== "false";
      return !requerido || Boolean(select.value);
    });

  if (todosSeleccionados) {
    selects[selects.length - 1].dispatchEvent(
      new Event("change", { bubbles: true }),
    );
  }
}

columnasArchivoShape.addEventListener("change", async () => {
  if (!nombreCarpetaActual) return;

  const { payload, completo } = construirPayloadValidacion();

  if (!completo) {
    ultimoPayloadValidacion = null;
    resultadoValidacion.innerHTML =
      '<div class="alert alert-warning">Selecciona una columna para cada campo requerido.</div>';
    btnConfirmarCarga.style.display = "none";
    return;
  }

  const payloadJson = JSON.stringify(payload);
  if (payloadJson === ultimoPayloadValidacion || validacionEnCurso) return;

  await ejecutarValidacion(payload, payloadJson);
});

btnConfirmarCarga.addEventListener("click", async () => {
  if (!nombreCarpetaActual) {
    mostrarToast("No hay datos validados para cargar.", "warning");
    return;
  }

  btnConfirmarCarga.disabled = true;

  try {
    const payload = {
      nombreCarpeta: nombreCarpetaActual,
      tabla: tablasGeograficas.value,
    };

    const cargarResp = await fetch(`${direccionApiGIS}cargar_shapefile`, {
      method: "POST",
      headers: construirHeadersConCsrf({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const cargarData = await procesarRespuestaApi(cargarResp, {
      accion: "cargar el shapefile",
      contenedor: resultadoValidacion,
      mensajeExito: (info) => `✅ ${info.mensaje}`,
    });

    if (!cargarData?.estado) return;

    // La carga corre en segundo plano: sondeamos el progreso hasta que termine
    // en lugar de mostrar el mensaje inicial con contadores en cero.
    if (!cargarData.jobId) {
      // Compatibilidad: backend antiguo que respondía de forma síncrona.
      resultadoValidacion.innerHTML = crearResumenCarga(cargarData);
      limpiarFormulario({ mantenerResultados: true });
      return;
    }

    const trabajo = await sondearEstadoCarga(cargarData.jobId, {
      onProgress: (estado) =>
        (resultadoValidacion.innerHTML = crearProgresoCarga(estado)),
    });

    if (trabajo.estado === ESTADO_TRABAJO.COMPLETADO) {
      mostrarToast("✅ Carga finalizada correctamente", "success");
      resultadoValidacion.innerHTML = crearResumenCarga(trabajo);
      limpiarFormulario({ mantenerResultados: true });
    } else {
      const mensajeError = trabajo.mensaje || "La carga no pudo completarse.";
      mostrarToast(`❌ ${mensajeError}`, "danger");
      resultadoValidacion.innerHTML = `<div class="alert alert-danger">${mensajeError}</div>`;
    }
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("❌ Error al cargar los datos", "danger");
    resultadoValidacion.innerHTML = `<div class="alert alert-danger">${
      error?.message || "Ocurrió un problema durante la carga."
    }</div>`;
  } finally {
    btnConfirmarCarga.disabled = false;
  }
});

// Espera asíncrona reutilizable.
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Consulta periódicamente el estado de un trabajo de importación hasta que
 * finaliza (completado/error) o se agota el número de intentos.
 * Devuelve el último estado conocido del trabajo.
 */
async function sondearEstadoCarga(jobId, { onProgress } = {}) {
  let ultimoEstado = {
    estado: ESTADO_TRABAJO.PROCESANDO,
    mensaje: "Iniciando carga...",
    porcentaje: 0,
  };

  for (let intento = 0; intento < SONDEO_CARGA.maxIntentos; intento += 1) {
    if (typeof onProgress === "function") onProgress(ultimoEstado);

    const resp = await fetch(`${direccionApiGIS}estado_carga/${jobId}`, {
      method: "GET",
      headers: construirHeadersConCsrf(),
      credentials: "include",
    });

    if (resp.ok) {
      const data = await resp.json().catch(() => null);
      if (data?.estado && data.trabajo) {
        ultimoEstado = data.trabajo;
        if (typeof onProgress === "function") onProgress(ultimoEstado);
        if (
          ultimoEstado.estado === ESTADO_TRABAJO.COMPLETADO ||
          ultimoEstado.estado === ESTADO_TRABAJO.ERROR
        ) {
          return ultimoEstado;
        }
      } else if (resp.status === 404) {
        // El trabajo expiró del registro: no podemos seguir sondeando.
        break;
      }
    }

    await esperar(SONDEO_CARGA.intervaloMs);
  }

  return {
    ...ultimoEstado,
    estado: ESTADO_TRABAJO.ERROR,
    mensaje:
      ultimoEstado.mensaje ||
      "No se pudo confirmar el estado de la carga (tiempo de espera agotado).",
  };
}

/** Renderiza la barra de progreso durante la carga en segundo plano. */
function crearProgresoCarga({ mensaje, porcentaje = 0, procesados, total } = {}) {
  const pct = Math.max(0, Math.min(100, Math.round(porcentaje) || 0));
  const detalle =
    Number.isFinite(total) && total > 0
      ? `<div class="small text-muted mt-1">${procesados ?? 0} / ${total} registros</div>`
      : "";

  return `
        <div class="mb-2 fw-semibold">${mensaje || "Procesando carga..."}</div>
        <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: ${pct}%">${pct}%</div>
        </div>
        ${detalle}
    `;
}

function mostrarResultadoValidacion(reporte, configActual) {
  if (!reporte.length) {
    resultadoValidacion.innerHTML =
      '<div class="alert alert-warning">No se encontraron registros válidos.</div>';
    return;
  }

  const keysReporte = Object.keys(reporte[0]);
  const totalKeyPreferido = configActual?.totalResumenKey;
  const totalKey =
    (totalKeyPreferido && totalKeyPreferido in reporte[0]
      ? totalKeyPreferido
      : null) ||
    keysReporte.find((key) => key.toLowerCase().includes("total")) ||
    keysReporte.find((key) => Number.isFinite(Number(reporte[0][key])));

  const total = totalKey
    ? reporte.reduce((sum, item) => sum + (Number(item[totalKey]) || 0), 0)
    : reporte.length;

  const columnasResumen = configActual?.columnasResumen?.length
    ? configActual.columnasResumen
    : keysReporte.map((key) => ({ key, titulo: key.toUpperCase() }));

  const encabezados = columnasResumen
    .map((columna) => {
      const className = columna.className
        ? ` class="${columna.className}"`
        : "";
      return `<th${className}>${columna.titulo}</th>`;
    })
    .join("");

  const filas = reporte
    .map((item) => {
      const celdas = columnasResumen
        .map((columna) => {
          const valor =
            typeof columna.obtenerValor === "function"
              ? columna.obtenerValor(item)
              : item[columna.key];
          const contenido = valor ?? "-";
          const className = columna.className
            ? ` class="${columna.className}"`
            : "";
          return `<td${className}>${contenido}</td>`;
        })
        .join("");

      return `<tr>${celdas}</tr>`;
    })
    .join("");

  resultadoValidacion.innerHTML = `
        <div class="alert alert-info">
            Se validaron <strong>${total}</strong> registros correctamente.
        </div>
        <div class="table-responsive">
            <table class="table table-sm mb-0">
                <thead>
                    <tr>
                        ${encabezados}
                    </tr>
                </thead>
                <tbody>
                    ${filas}
                </tbody>
            </table>
        </div>
    `;
}

function crearResumenCarga(trabajo = {}) {
  // El backend (endpoint estado_carga) expone las claves: insertados, historico
  // y procesados. Se mantienen alias por compatibilidad con respuestas previas.
  const insertados = trabajo.insertados ?? trabajo.registrosInsertados ?? 0;
  const historico = trabajo.historico ?? trabajo.registrosHistorico ?? 0;
  const procesados = trabajo.procesados ?? trabajo.total;
  const lineaProcesados = Number.isFinite(procesados)
    ? `<p class="mb-1">Registros procesados: <strong>${procesados}</strong></p>`
    : "";

  return `
        <div class="alert alert-success mt-2">
            <p class="mb-1 fw-semibold">${trabajo.mensaje || "Carga finalizada correctamente."}</p>
            ${lineaProcesados}
            <p class="mb-1">Registros insertados: <strong>${insertados}</strong></p>
            <p class="mb-0">Registros enviados al histórico: <strong>${historico}</strong></p>
        </div>
    `;
}

btnLimpiarArchivo.addEventListener("click", () => {
  limpiarFormulario();
});

function construirPayloadValidacion() {
  const configActual = configuracionCapas[tablasGeograficas.value];
  const payload = {
    nombreCarpeta: nombreCarpetaActual,
    tabla: tablasGeograficas.value,
  };

  if (!configActual) {
    return { payload, completo: true };
  }

  let completo = true;

  configActual.campos.forEach((campo) => {
    const select = columnasArchivoShape.querySelector(
      `select[name="map_${campo.id}"]`,
    );

    if (!select) return;

    const valor = select.value;

    if (valor) {
      payload[campo.id] = valor;
    }

    const esRequerido = campo.required !== false;

    if (esRequerido && !valor) {
      select.classList.add("is-invalid");
      completo = false;
    } else {
      select.classList.remove("is-invalid");
    }
  });

  return { payload, completo };
}

async function ejecutarValidacion(payload, payloadJson) {
  try {
    validacionEnCurso = true;
    resultadoValidacion.innerHTML =
      '<div class="alert alert-info">Validando shapefile...</div>';
    btnConfirmarCarga.style.display = "none";

    const configActual = configuracionCapas[tablasGeograficas.value];
    if (!configActual) {
      mostrarToast(
        "La capa seleccionada no está configurada para validación.",
        "warning",
      );
      return;
    }

    const validarResp = await fetch(`${direccionApiGIS}validar_shapefile`, {
      method: "POST",
      headers: construirHeadersConCsrf({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(payload),
      credentials: "include",
    });

    const validarData = await procesarRespuestaApi(validarResp, {
      accion: "validar el shapefile",
      contenedor: resultadoValidacion,
      mostrarReporte: true,
      mensajeExito: (info) => `✅ ${info.mensaje}`,
    });

    if (!validarData) {
      ultimoPayloadValidacion = null;
      return;
    }

    ultimoPayloadValidacion = payloadJson;

    mostrarResultadoValidacion(
      validarData.reporte || [],
      configuracionCapas[tablasGeograficas.value],
    );
    btnConfirmarCarga.style.display = "block";
    btnConfirmarCarga.disabled = false;
  } catch (error) {
    console.error("Error:", error);
    mostrarToast("❌ Error en la validación", "danger");
    resultadoValidacion.innerHTML =
      '<div class="alert alert-danger">Ocurrió un problema al validar el shapefile.</div>';
    ultimoPayloadValidacion = null;
  } finally {
    validacionEnCurso = false;
  }
}

function limpiarFormulario({ mantenerResultados = false } = {}) {
  archivoZip.value = "";
  archivoZip.disabled = false;
  resetDropify();
  columnasArchivoShape.innerHTML = "";
  if (!mantenerResultados) {
    resultadoValidacion.innerHTML = "";
  }
  btnConfirmarCarga.style.display = "none";
  btnConfirmarCarga.disabled = false;
  btnCargarArchivoZip.style.display = "";
  btnCargarArchivoZip.disabled = false;
  tablasGeograficas.value = tablaPorDefecto;
  tablasGeograficas.disabled = false;
  nombreCarpetaActual = null;
  ultimoPayloadValidacion = null;
  validacionEnCurso = false;
  actualizarManualCampos();
}

// ── Manual dinámico de campos obligatorios ──────────────────────────────────
// Muestra, para la tabla seleccionada, qué campos debe preparar el usuario y
// cuántos dígitos admite cada uno. La información proviene del api-gis
// (endpoint /campos_tabla/<tabla>), que es la fuente única de las reglas.

const cacheCamposTabla = new Map();

async function obtenerCamposTabla(tabla) {
  if (cacheCamposTabla.has(tabla)) return cacheCamposTabla.get(tabla);

  const resp = await fetch(`${direccionApiGIS}campos_tabla/${tabla}`, {
    method: "GET",
    headers: construirHeadersConCsrf(),
    credentials: "include",
  });

  if (!resp.ok) {
    throw new Error(`No se pudo obtener la información de la tabla (${resp.status}).`);
  }

  const data = await resp.json();
  if (!data?.estado || !data.tabla) {
    throw new Error(data?.mensaje || "Respuesta inválida del servidor.");
  }

  cacheCamposTabla.set(tabla, data.tabla);
  return data.tabla;
}

function crearManualCampos({ tabla, geometria, srid, campos = [] }) {
  const filas = campos
    .map((campo) => {
      const obligatorio = campo.obligatorio
        ? '<span class="badge bg-danger">Obligatorio</span>'
        : '<span class="badge bg-secondary">Opcional</span>';
      const tipo = campo.tipo === "numerico" ? "Numérico" : "Texto";
      const digitos = campo.digitos
        ? `${campo.digitos} díg.`
        : "Variable";
      return `
        <tr>
          <td><code>${campo.etiqueta}</code></td>
          <td>${tipo}</td>
          <td class="text-center">${digitos}</td>
          <td class="text-center">${obligatorio}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="alert alert-light border mb-0">
      <div class="fw-semibold mb-1">
        <i data-feather="info" class="icon-sm"></i>
        Campos requeridos para <strong>${tabla}</strong>
      </div>
      <div class="small text-muted mb-2">
        Geometría: <strong>${geometria}</strong> · Proyección: <strong>EPSG:${srid}</strong>.
        Prepara las columnas del shapefile respetando el número de dígitos indicado.
      </div>
      <div class="table-responsive">
        <table class="table table-sm table-bordered align-middle mb-0">
          <thead class="table-light">
            <tr>
              <th>Campo</th>
              <th>Tipo</th>
              <th class="text-center">Dígitos</th>
              <th class="text-center">Requerido</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
}

async function actualizarManualCampos() {
  if (!manualCamposTabla) return;

  const tabla = tablasGeograficas.value;
  manualCamposTabla.innerHTML =
    '<div class="small text-muted">Cargando campos requeridos...</div>';

  try {
    const info = await obtenerCamposTabla(tabla);
    manualCamposTabla.innerHTML = crearManualCampos(info);
    // Re-renderiza los íconos feather si la librería está disponible.
    if (window.feather?.replace) window.feather.replace();
  } catch (error) {
    console.error("Error al cargar el manual de campos:", error);
    manualCamposTabla.innerHTML = `<div class="small text-danger">${
      error?.message || "No se pudieron cargar los campos requeridos."
    }</div>`;
  }
}

tablasGeograficas.addEventListener("change", actualizarManualCampos);

// Render inicial para la tabla seleccionada por defecto.
actualizarManualCampos();
