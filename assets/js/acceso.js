import { direccionApiGIS, mostrarToast } from "./configuracion";

const loginForm = document.getElementById("loginForm");
const inputUsuario = document.getElementById("loginUsuario");
const inputContrasena = document.getElementById("loginContrasena");
const nombreEl = document.getElementById("nombres_apellidos");
const correoEl = document.getElementById("correo_electronico");
const panel2Button = document.querySelector('button[data-panel="panel2"]');
const panel2 = document.getElementById("panel2");
const logoutItem = document.getElementById("logoutItem");

const actualizarEstadoAutenticacion = (autenticado) => {
  document.body.classList.toggle("usuario-autenticado", autenticado);
  document.dispatchEvent(
    new CustomEvent("estado-autenticacion", {
      detail: { autenticado },
    }),
  );
};

const ocultarPanel2 = () => {
  if (panel2Button) {
    panel2Button.style.display = "none";
    panel2Button.classList.remove("active");
  }
  if (panel2) {
    panel2.style.display = "none";
  }
};

const mostrarPanel2 = () => {
  if (panel2Button) {
    panel2Button.style.display = "inline-flex";
  }
};

const ocultarPerfil = () => {
  if (logoutItem) {
    logoutItem.style.display = "none";
  }
};

const mostrarPerfil = () => {
  if (logoutItem) {
    logoutItem.style.display = "";
  }
};

const ocultarLoginForm = () => {
  if (loginForm) {
    loginForm.style.display = "none";
  }
};

const mostrarLoginForm = () => {
  if (loginForm) {
    loginForm.style.display = "";
  }
};

const restablecerPerfil = () => {
  if (nombreEl) {
    nombreEl.textContent = "Visor catastral";
  }
  if (correoEl) {
    correoEl.textContent = "acceso al módulo";
  }
};

const limpiarCredenciales = () => {
  if (inputUsuario) {
    inputUsuario.value = "";
  }
  if (inputContrasena) {
    inputContrasena.value = "";
  }
};

ocultarPanel2();
ocultarPerfil();
mostrarLoginForm();
actualizarEstadoAutenticacion(false);

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const usuario = inputUsuario?.value?.trim();
    const contrasena = inputContrasena?.value ?? "";

    if (!usuario || !contrasena) {
      mostrarToast("Completa usuario y contraseña.", "warning");
      return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Ingresando...";
    }

    try {
      const respuesta = await fetch(`${direccionApiGIS}token/acceso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena }),
        credentials: "include",
      });

      const data = await respuesta.json();
      //console.log(data);
      if (data?.estado) {
        const datos = data?.datos || {};
        if (nombreEl) {
          nombreEl.textContent =
            datos.nombres_apellidos || "Usuario autorizado";
        }
        if (correoEl) {
          correoEl.textContent = datos.correo_electronico || "";
        }
        mostrarPanel2();
        mostrarPerfil();
        ocultarLoginForm();
        actualizarEstadoAutenticacion(true);
      } else {
        ocultarPanel2();
        ocultarPerfil();
        mostrarLoginForm();
        actualizarEstadoAutenticacion(false);
        const mensaje = data?.msj || "Usuario no autorizado.";
        mostrarToast(mensaje, "danger");
      }
    } catch (error) {
      ocultarPanel2();
      ocultarPerfil();
      mostrarLoginForm();
      actualizarEstadoAutenticacion(false);
      mostrarToast(
        "Error al conectar con el servicio de autenticación.",
        "danger",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Ingresar";
      }
    }
  });
}

if (logoutItem) {
  logoutItem.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      await fetch(`${direccionApiGIS}token/salir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch (error) {
      mostrarToast(
        "No se pudo cerrar la sesión, se restablecerá el acceso.",
        "warning",
      );
    } finally {
      ocultarPanel2();
      ocultarPerfil();
      mostrarLoginForm();
      actualizarEstadoAutenticacion(false);
      restablecerPerfil();
      limpiarCredenciales();
    }
  });
}
