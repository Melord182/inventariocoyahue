// src/js/ajustes.js
// Perfil + cambio de contraseña usando la API Django (JWT)

import { API } from "/src/js/api.js";

const PROFILE_ENDPOINT = "usuarios/me/";
const CHANGE_PASSWORD_ENDPOINT = "usuarios/cambiar_password/";

// ===================== HELPERS =====================

function showSuccess(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: msg,
      timer: 1800,
      showConfirmButton: false,
    });
  } else {
    alert(msg);
  }
}

function showError(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: msg,
    });
  } else {
    alert("Error: " + msg);
  }
}

// Intenta sacar un mensaje más legible desde el Error que lanza api.js
function extractErrorMessage(err) {
  if (!err || !err.message) return "Ocurrió un error inesperado.";
  try {
    const data = JSON.parse(err.message);
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    // Combina mensajes de validación de DRF si hay
    const parts = [];
    Object.keys(data).forEach((k) => {
      const val = data[k];
      if (Array.isArray(val)) {
        parts.push(`${k}: ${val.join(", ")}`);
      } else {
        parts.push(`${k}: ${val}`);
      }
    });
    if (parts.length) return parts.join(" | ");
    return err.message;
  } catch {
    return err.message;
  }
}

function mapPerfilData(data) {
  // Asumimos serializer tipo UsuariosSerializer con email + nombre_completo
  const email =
    data.email ||
    (data.user && data.user.email) ||
    "";
  const nombreCompleto =
    data.nombre_completo ||
    [
      data.user && data.user.first_name,
      data.user && data.user.last_name,
    ]
      .filter(Boolean)
      .join(" ") ||
    "";

  return { email, nombreCompleto };
}

// ===================== PERFIL: CARGAR =====================

async function cargarPerfilEnFormularios() {
  try {
    const data = await API.get(PROFILE_ENDPOINT);
    const { email, nombreCompleto } = mapPerfilData(data);

    // --- Form perfil en ajustes.html ---
    const inputNombreUsuario = document.getElementById("nombreUsuario");
    const inputEmailUsuario = document.getElementById("emailUsuario");
    const avatarInitial = document.getElementById("avatarInitial");

    if (inputNombreUsuario) {
      inputNombreUsuario.value = nombreCompleto;
      if (avatarInitial) {
        avatarInitial.textContent = nombreCompleto
          ? nombreCompleto.charAt(0).toUpperCase()
          : "U";
      }
    }
    if (inputEmailUsuario) {
      inputEmailUsuario.value = email;
    }

    // --- Form perfil standalone (perfil.html) ---
    const inputNombre = document.getElementById("nombre");
    const inputEmail = document.getElementById("email");

    if (inputNombre) inputNombre.value = nombreCompleto;
    if (inputEmail) inputEmail.value = email;
  } catch (err) {
    console.error("Error al cargar perfil:", err);
    showError("No se pudieron cargar los datos del perfil.");
  }
}

// ===================== PERFIL: GUARDAR =====================

// Perfil dentro de ajustes.html
async function guardarPerfilDesdeAjustes(e) {
  e.preventDefault();

  const inputNombre = document.getElementById("nombreUsuario");
  const inputEmail = document.getElementById("emailUsuario");
  const btn = e.submitter || e.target.querySelector("button[type='submit']");

  if (!inputNombre || !inputEmail) {
    showError("No se encontró el formulario de perfil.");
    return;
  }

  const nombreCompleto = inputNombre.value.trim();
  const email = inputEmail.value.trim();

  if (!nombreCompleto || !email) {
    showError("Nombre y correo son obligatorios.");
    return;
  }

  // Separamos nombre en first_name y last_name por el último espacio
  let firstName = nombreCompleto;
  let lastName = "";
  const partes = nombreCompleto.split(" ");
  if (partes.length > 1) {
    firstName = partes.slice(0, -1).join(" ");
    lastName = partes.slice(-1).join(" ");
  }

  const payload = {
    email,
    first_name: firstName,
    last_name: lastName,
  };

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
    }

    await API.patch(PROFILE_ENDPOINT, payload);
    showSuccess("Perfil actualizado correctamente.");
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    showError(extractErrorMessage(err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-2"></i> Guardar cambios';
    }
  }
}

// Perfil standalone (perfil.html)
async function guardarPerfilStandalone(e) {
  e.preventDefault();

  const inputNombre = document.getElementById("nombre");
  const inputEmail = document.getElementById("email");
  const btn = e.submitter || e.target.querySelector("button[type='submit']");

  if (!inputNombre || !inputEmail) {
    showError("No se encontró el formulario de perfil.");
    return;
  }

  const nombreCompleto = inputNombre.value.trim();
  const email = inputEmail.value.trim();

  if (!nombreCompleto || !email) {
    showError("Nombre y correo son obligatorios.");
    return;
  }

  let firstName = nombreCompleto;
  let lastName = "";
  const partes = nombreCompleto.split(" ");
  if (partes.length > 1) {
    firstName = partes.slice(0, -1).join(" ");
    lastName = partes.slice(-1).join(" ");
  }

  const payload = {
    email,
    first_name: firstName,
    last_name: lastName,
  };

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Guardando...";
    }

    await API.patch(PROFILE_ENDPOINT, payload);
    showSuccess("Perfil actualizado correctamente.");
  } catch (err) {
    console.error("Error al actualizar perfil:", err);
    showError(extractErrorMessage(err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  }
}

// ===================== CONTRASEÑA =====================

function evaluarFuerza(pass, strengthBar, msgPass) {
  if (!strengthBar || !msgPass) return;

  const regexMayus = /[A-Z]/;
  const regexNum = /[0-9]/;

  let fuerza = 0;
  if (pass.length >= 8) fuerza++;
  if (regexMayus.test(pass)) fuerza++;
  if (regexNum.test(pass)) fuerza++;

  strengthBar.className = "password-strength";
  msgPass.style.color = "#6c757d";

  if (!pass) {
    msgPass.textContent =
      "Debe tener mínimo 8 caracteres, una mayúscula y un número 😊";
    return;
  }

  if (fuerza === 1) {
    strengthBar.classList.add("strength-weak");
    msgPass.textContent = "Muy débil — agrega número y mayúscula";
    msgPass.style.color = "#dc3545";
  } else if (fuerza === 2) {
    strengthBar.classList.add("strength-medium");
    msgPass.textContent = "Casi lista — refuérzala un poco más";
    msgPass.style.color = "#ffc107";
  } else if (fuerza === 3) {
    strengthBar.classList.add("strength-strong");
    msgPass.textContent = "¡Contraseña segura! 😄";
    msgPass.style.color = "#28a745";
  }
}

async function cambiarPasswordAPI(oldPass, newPass) {
  return API.post(CHANGE_PASSWORD_ENDPOINT, {
    old_password: oldPass,
    new_password: newPass,
  });
}

// Form de seguridad en ajustes.html
async function manejarCambioPassAjustes(e) {
  e.preventDefault();

  const passActual = document.getElementById("passActual");
  const passNueva = document.getElementById("passNueva");
  const passConfirm = document.getElementById("passConfirm");
  const strengthBar = document.getElementById("strengthBar");
  const btn = e.submitter || e.target.querySelector("button[type='submit']");

  if (!passActual || !passNueva || !passConfirm) {
    showError("Formulario de contraseña incompleto.");
    return;
  }

  const actual = passActual.value;
  const nueva = passNueva.value;
  const confirmar = passConfirm.value;

  if (!actual || !nueva || !confirmar) {
    showError("Todos los campos son obligatorios.");
    return;
  }

  if (nueva !== confirmar) {
    showError("Las contraseñas no coinciden.");
    return;
  }

  // (Opcional) exigir barra en fuerte
  if (strengthBar && !strengthBar.classList.contains("strength-strong")) {
    showError("La contraseña no cumple los requisitos mínimos.");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
    }

    await cambiarPasswordAPI(actual, nueva);
    showSuccess("Contraseña actualizada correctamente.");

    passActual.value = "";
    passNueva.value = "";
    passConfirm.value = "";
    if (strengthBar) {
      strengthBar.className = "password-strength";
    }
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    showError(extractErrorMessage(err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML =
        '<i class="bi bi-shield-lock me-2"></i> Guardar contraseña';
    }
  }
}

// Form standalone en contraseña.html
async function manejarCambioPassStandalone(e) {
  e.preventDefault();

  const actual = document.getElementById("actual");
  const nueva = document.getElementById("nueva");
  const confirmar = document.getElementById("confirmar");
  const btn = e.submitter || e.target.querySelector("button[type='submit']");

  if (!actual || !nueva || !confirmar) {
    showError("Formulario de contraseña incompleto.");
    return;
  }

  if (!actual.value || !nueva.value || !confirmar.value) {
    showError("Todos los campos son obligatorios.");
    return;
  }

  if (nueva.value !== confirmar.value) {
    showError("Las contraseñas nuevas no coinciden.");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Guardando...";
    }

    await cambiarPasswordAPI(actual.value, nueva.value);
    showSuccess("Contraseña actualizada correctamente.");
    actual.value = "";
    nueva.value = "";
    confirmar.value = "";
  } catch (err) {
    console.error("Error al cambiar contraseña:", err);
    showError(extractErrorMessage(err));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  }
}

// ===================== INIT =====================

document.addEventListener("DOMContentLoaded", () => {
  // Cargar perfil si hay algún formulario de perfil
  if (
    document.getElementById("perfilForm") ||
    document.getElementById("formPerfil")
  ) {
    cargarPerfilEnFormularios();
  }

  // Perfil dentro de ajustes.html
  const perfilFormAjustes = document.getElementById("perfilForm");
  if (perfilFormAjustes) {
    perfilFormAjustes.addEventListener("submit", guardarPerfilDesdeAjustes);

    // Avatar inicial dinámico + preview de imagen
    const nombreUsuario = document.getElementById("nombreUsuario");
    const avatarInitial = document.getElementById("avatarInitial");
    const avatarCircle = document.getElementById("avatarCircle");
    const uploadPhoto = document.getElementById("uploadPhoto");

    if (nombreUsuario && avatarInitial) {
      nombreUsuario.addEventListener("input", () => {
        const nombre = nombreUsuario.value.trim();
        avatarInitial.textContent = nombre
          ? nombre.charAt(0).toUpperCase()
          : "U";
      });
    }

    if (uploadPhoto && avatarCircle) {
      uploadPhoto.addEventListener("change", () => {
        const file = uploadPhoto.files[0];
        if (!file) return;
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        avatarCircle.innerHTML = "";
        avatarCircle.appendChild(img);
      });
    }
  }

  // Perfil standalone (perfil.html)
  const perfilFormStandalone = document.getElementById("formPerfil");
  if (perfilFormStandalone) {
    perfilFormStandalone.addEventListener("submit", guardarPerfilStandalone);
  }

  // Seguridad dentro de ajustes.html
  const passwordForm = document.getElementById("passwordForm");
  if (passwordForm) {
    const passNueva = document.getElementById("passNueva");
    const strengthBar = document.getElementById("strengthBar");
    const msgPass = document.getElementById("msgPass");

    if (passNueva && strengthBar && msgPass) {
      passNueva.addEventListener("input", () =>
        evaluarFuerza(passNueva.value, strengthBar, msgPass)
      );
    }

    passwordForm.addEventListener("submit", manejarCambioPassAjustes);
  }

  // Seguridad standalone (contraseña.html)
  const formCambiar = document.getElementById("formCambiarContraseña");
  if (formCambiar) {
    formCambiar.addEventListener("submit", manejarCambioPassStandalone);
  }
});
