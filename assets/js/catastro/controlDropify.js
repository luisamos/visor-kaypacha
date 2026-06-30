/**
 * controlDropify.js
 * Aplica Dropify al input de archivo del panel "Importar datos geográficos"
 * para una zona de carga moderna (arrastrar/soltar + vista previa).
 *
 * Dropify es un plugin de jQuery; se importa jQuery y el plugin (UMD) los une.
 * El <input id="archivoZip"> real se conserva, por lo que controlCargarDatos.js
 * sigue leyendo archivoZip.files[0] sin cambios.
 */
import $ from "jquery";
import "dropify/dist/css/dropify.min.css";
import "dropify";

let dropifyInstance = null;

export function initDropify() {
  const $input = $("#archivoZip");
  if (!$input.length || dropifyInstance) return;

  const drEvent = $input.dropify({
    messages: {
      default: "Arrastra o haz clic para subir el ShapeFile (.zip)",
      replace: "Arrastra o haz clic para reemplazar el archivo",
      remove: "Quitar",
      error: "Ocurrió un error al cargar el archivo",
    },
    error: {
      fileExtension: "Solo se permiten archivos .zip",
    },
  });

  dropifyInstance = drEvent.data("dropify");
}

// Reinicia la vista previa de Dropify cuando el formulario se limpia
// programáticamente (al asignar archivoZip.value = "" no se dispara change).
export function resetDropify() {
  if (!dropifyInstance) return;
  dropifyInstance.resetPreview();
  dropifyInstance.clearElement();
}
