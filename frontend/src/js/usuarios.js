// src/js/usuarios.js
// CRUD de Usuarios usando API Django + JWT

import { API } from "/src/js/api.js";

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function normalizarLista(resp) {
  if (Array.isArray(resp)) return resp;
  if (resp && Array.isArray(resp.results)) return resp.results;
  return [];
}

function alertSuccess(msg) {
  if (window.Swal) {
    Swal.fire({ icon: "success", title: msg, timer: 1500, showConfirmButton: false });
  } else {
    alert(msg);
  }
}

function alertError(msg) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title: "Error", text: msg });
  } else {
    alert(msg);
  }
}

// ================== LISTAR ==================
async function initListarUsuarios() {
  const tbody = document.getElementById("tablaUsuarios");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center text-muted">Cargando usuarios...</td>
    </tr>
  `;

  try {
    const resp = await API.get("usuarios/");
    const usuarios = normalizarLista(resp);

    if (!usuarios.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">No hay usuarios registrados.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = "";
    usuarios.forEach((u) => {
      const tr = document.createElement("tr");

      const username = u.username || (u.user && u.user.username) || "";
      const nombre = u.nombre_completo || "";
      const email = u.email || (u.user && u.user.email) || "";
      const rol = u.rol || "";
      const isStaff = !!u.is_staff;

      tr.innerHTML = `
        <td>${username}</td>
        <td>${nombre}</td>
        <td>${email}</td>
        <td>${rol}</td>
        <td>
          ${
            isStaff
              ? '<span class="badge bg-success">Staff</span>'
              : '<span class="badge bg-secondary">Usuario</span>'
          }
        </td>
        <td class="text-center">
          <a href="editar.html?id=${u.id}" class="btn btn-outline-primary btn-sm me-1" title="Editar">
            <i class="bi bi-pencil"></i>
          </a>
          <a href="eliminar.html?id=${u.id}" class="btn btn-outline-danger btn-sm" title="Eliminar">
            <i class="bi bi-trash"></i>
          </a>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error al cargar usuarios:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-danger">No se pudieron cargar los usuarios.</td>
      </tr>
    `;
  }
}

// ================== AGREGAR ==================
function initAgregarUsuario() {
  const form = document.getElementById("formUsuarioCrear");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username")?.value.trim();
    const firstName = document.getElementById("first_name")?.value.trim();
    const lastName = document.getElementById("last_name")?.value.trim();
    const email = document.getElementById("email")?.value.trim();
    const rol = document.getElementById("rol")?.value.trim() || "";
    const isStaff = document.getElementById("is_staff")?.checked || false;
    const password = document.getElementById("password")?.value || "";
    const password2 = document.getElementById("password2")?.value || "";

    if (!username || !firstName || !lastName || !email || !password) {
      alertError("Completa todos los campos obligatorios.");
      return;
    }

    if (password !== password2) {
      alertError("Las contraseñas no coinciden.");
      return;
    }

    const payload = {
      username,
      password,
      email,
      first_name: firstName,
      last_name: lastName,
      rol,
      is_staff: isStaff,
    };

    try {
      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
      }

      await API.post("usuarios/", payload);
      alertSuccess("Usuario creado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear usuario:", err);
      alertError("No se pudo crear el usuario. Revisa los datos.");
    }
  });
}

// ================== EDITAR ==================
async function initEditarUsuario() {
  const form = document.getElementById("formUsuarioEditar");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID del usuario.");
    window.location.href = "listar.html";
    return;
  }

  const inputId = document.getElementById("idUsuario");
  const inputUsername = document.getElementById("username");
  const inputFirst = document.getElementById("first_name");
  const inputLast = document.getElementById("last_name");
  const inputEmail = document.getElementById("email");
  const inputRol = document.getElementById("rol");
  const inputStaff = document.getElementById("is_staff");

  // Cargar usuario
  try {
    const u = await API.get(`usuarios/${id}/`);

    const username = u.username || (u.user && u.user.username) || "";
    const email = u.email || (u.user && u.user.email) || "";
    const rol = u.rol || "";
    const isStaff = !!u.is_staff;
    const nombreCompleto = u.nombre_completo || "";

    let firstName = u.first_name || "";
    let lastName = u.last_name || "";

    if (!firstName && !lastName && nombreCompleto) {
      const partes = nombreCompleto.split(" ");
      firstName = partes.slice(0, -1).join(" ") || nombreCompleto;
      lastName = partes.slice(-1).join(" ");
    }

    if (inputId) inputId.value = u.id;
    if (inputUsername) {
      inputUsername.value = username;
      inputUsername.disabled = true; // no permitir cambiar username desde aquí
    }
    if (inputFirst) inputFirst.value = firstName;
    if (inputLast) inputLast.value = lastName;
    if (inputEmail) inputEmail.value = email;
    if (inputRol) inputRol.value = rol;
    if (inputStaff) inputStaff.checked = isStaff;
  } catch (err) {
    console.error("Error al cargar usuario:", err);
    alertError("No se pudo cargar el usuario.");
    window.location.href = "listar.html";
    return;
  }

  // Guardar cambios
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = inputFirst?.value.trim() || "";
    const lastName = inputLast?.value.trim() || "";
    const email = inputEmail?.value.trim() || "";
    const rol = inputRol?.value.trim() || "";
    const isStaff = inputStaff?.checked || false;
    const password = document.getElementById("password")?.value || "";
    const password2 = document.getElementById("password2")?.value || "";

    if (!firstName || !lastName || !email) {
      alertError("Nombre, apellido y email son obligatorios.");
      return;
    }

    if (password && password !== password2) {
      alertError("Las contraseñas no coinciden.");
      return;
    }

    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      rol,
      is_staff: isStaff,
    };

    if (password) {
      payload.password = password;
    }

    try {
      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...';
      }

      await API.patch(`usuarios/${id}/`, payload);
      alertSuccess("Usuario actualizado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      alertError("No se pudo actualizar el usuario. Revisa los datos.");
    }
  });
}

// ================== ELIMINAR ==================
async function initEliminarUsuario() {
  const form = document.getElementById("formUsuarioEliminar");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID del usuario.");
    window.location.href = "listar.html";
    return;
  }

  const infoDiv = document.getElementById("infoUsuario");
  const inputId = document.getElementById("idUsuario");

  try {
    const u = await API.get(`usuarios/${id}/`);
    const username = u.username || (u.user && u.user.username) || "";
    const email = u.email || (u.user && u.user.email) || "";
    const nombre = u.nombre_completo || "";

    if (infoDiv) {
      infoDiv.innerHTML = `
        <p class="mb-1"><strong>Usuario:</strong> ${username}</p>
        <p class="mb-1"><strong>Nombre:</strong> ${nombre}</p>
        <p class="mb-0"><strong>Email:</strong> ${email}</p>
      `;
    }
    if (inputId) inputId.value = u.id;
  } catch (err) {
    console.error("Error al cargar usuario:", err);
    alertError("No se pudo cargar el usuario.");
    window.location.href = "listar.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

    try {
      const btn = form.querySelector("button[type='submit']");
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Eliminando...';
      }

      await API.delete(`usuarios/${id}/`);
      alertSuccess("Usuario eliminado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      alertError("No se pudo eliminar el usuario.");
    }
  });
}

// ================== INIT GLOBAL ==================
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("tablaUsuarios")) initListarUsuarios();
  if (document.getElementById("formUsuarioCrear")) initAgregarUsuario();
  if (document.getElementById("formUsuarioEditar")) initEditarUsuario();
  if (document.getElementById("formUsuarioEliminar")) initEliminarUsuario();
});
