import { Modal } from "bootstrap";
import {
  direccionApiGIS,
  construirHeadersConCsrf,
  mostrarToast,
} from "../core/configuracion.js";

export function initControlBackupConfig() {
  document.addEventListener("estado-autenticacion", ({ detail }) => {
    const configItem = document.getElementById("backupConfigItem");
    if (configItem) configItem.classList.toggle("d-none", !detail.autenticado);
    if (detail.autenticado) cargarConfiguracion();
  });

  document.getElementById("btnAbrirConfiguracion")?.addEventListener("click", () => {
    const modal = Modal.getOrCreateInstance(
      document.getElementById("modalBackupConfig")
    );
    cargarConfiguracion();
    cargarLogsBackup();
    modal.show();
  });

  document
    .getElementById("tab-historial")
    ?.addEventListener("shown.bs.tab", cargarLogsBackup);

  document
    .getElementById("btnGuardarBackupConfig")
    ?.addEventListener("click", guardarConfiguracion);

  document
    .getElementById("btnEjecutarBackupAhora")
    ?.addEventListener("click", ejecutarBackupAhora);

  document
    .getElementById("btnRefrescarLogsBackup")
    ?.addEventListener("click", cargarLogsBackup);
}

async function cargarConfiguracion() {
  try {
    const resp = await fetch(`${direccionApiGIS}backup/configuracion`, {
      method: "GET",
      headers: construirHeadersConCsrf({ "Content-Type": "application/json" }),
      credentials: "include",
    });
    if (!resp.ok) return;
    const json = await resp.json();
    const d = json.datos ?? {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v ?? "";
    };
    set("backupRutaDestino", d.ruta_destino);
    set("backupFrecuenciaTipo", d.frecuencia_tipo ?? "diario");
    set("backupHora", d.hora_backup ?? "02:00");
    const sw = document.getElementById("backupActivo");
    if (sw) sw.checked = d.activo !== false;
  } catch (_) {
    // sin configuracion aun, silencioso
  }
}

async function guardarConfiguracion() {
  const ruta_destino = document.getElementById("backupRutaDestino")?.value?.trim();
  const frecuencia_tipo = document.getElementById("backupFrecuenciaTipo")?.value;
  const hora_backup = document.getElementById("backupHora")?.value;
  const activo = document.getElementById("backupActivo")?.checked ?? true;

  if (!ruta_destino) {
    mostrarToast("Ingrese la ruta de destino del backup", "warning");
    return;
  }

  const btn = document.getElementById("btnGuardarBackupConfig");
  if (btn) { btn.disabled = true; btn.textContent = "Guardando..."; }

  try {
    const resp = await fetch(`${direccionApiGIS}backup/configuracion`, {
      method: "POST",
      headers: construirHeadersConCsrf({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify({ ruta_destino, frecuencia_tipo, hora_backup, activo }),
    });
    const json = await resp.json();
    mostrarToast(
      json.estado ? "Configuracion guardada correctamente" : (json.mensaje || "Error al guardar"),
      json.estado ? "success" : "error"
    );
  } catch (_) {
    mostrarToast("Error de conexion al guardar configuracion", "error");
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Guardar configuracion"; }
  }
}

async function ejecutarBackupAhora() {
  const btn = document.getElementById("btnEjecutarBackupAhora");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Ejecutando...';
  }
  try {
    const resp = await fetch(`${direccionApiGIS}backup/ejecutar`, {
      method: "POST",
      headers: construirHeadersConCsrf({ "Content-Type": "application/json" }),
      credentials: "include",
    });
    const json = await resp.json();
    mostrarToast(
      json.mensaje || (json.estado ? "Backup ejecutado exitosamente" : "Error al ejecutar backup"),
      json.estado ? "success" : "error"
    );
    cargarLogsBackup();
  } catch (_) {
    mostrarToast("Error de conexion al ejecutar backup", "error");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="feather icon-play me-1"></i>Ejecutar backup ahora';
    }
  }
}

async function cargarLogsBackup() {
  const tbody = document.getElementById("backupLogsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">
    <span class="spinner-border spinner-border-sm me-1"></span>Cargando...
  </td></tr>`;

  try {
    const resp = await fetch(`${direccionApiGIS}backup/logs`, {
      method: "GET",
      headers: construirHeadersConCsrf({ "Content-Type": "application/json" }),
      credentials: "include",
    });
    const json = await resp.json();
    const logs = json.datos ?? [];

    if (logs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">Sin registros de backup</td></tr>`;
      return;
    }

    tbody.innerHTML = logs.map((log) => {
      const fecha = log.fecha_backup
        ? new Date(log.fecha_backup).toLocaleString("es-PE")
        : "-";
      const badge = log.exitoso
        ? `<span class="badge bg-success">Exitoso</span>`
        : `<span class="badge bg-danger">Fallido</span>`;
      const tamano = log.tamano_bytes
        ? `${(log.tamano_bytes / 1024 / 1024).toFixed(2)} MB`
        : "-";
      const duracion = log.duracion_segundos != null ? `${log.duracion_segundos}s` : "-";
      const archivo = log.ruta_archivo
        ? `<span class="text-truncate d-block" style="max-width:160px" title="${log.ruta_archivo}">${log.ruta_archivo.split(/[\\/]/).pop()}</span>`
        : "-";
      return `<tr>
        <td class="small">${fecha}</td>
        <td><code>${log.esquema}</code></td>
        <td>${badge}</td>
        <td>${archivo}</td>
        <td class="small">${tamano}</td>
        <td class="small">${duracion}</td>
      </tr>`;
    }).join("");
  } catch (_) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar historial</td></tr>`;
  }
}
