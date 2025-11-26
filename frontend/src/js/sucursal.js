// src/js/sucursal.js
// Gestión de Sucursales usando la API Django + JWT

import { API } from "/src/js/api.js";

let sucursalesCache = [];

// ------------------ Helpers ------------------
function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function alertSuccess(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: msg,
      timer: 1500,
      showConfirmButton: false,
    });
  } else {
    alert(msg);
  }
}

function alertError(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "error",
      title: "Error",
      text: msg,
    });
  } else {
    alert(msg);
  }
}

// ------------------ Inicialización ------------------
document.addEventListener("DOMContentLoaded", () => {
  // Listado (tabla + cards)
  if (document.getElementById("tablaSucursales")) {
    initListarSucursales();
  }

  // Formularios
  if (document.getElementById("formSucursal")) {
    initAgregarSucursal();
  }
  if (document.getElementById("formEditarSucursal")) {
    initEditarSucursal();
  }
});

// ====================================================
// LISTAR
// ====================================================
async function initListarSucursales() {
  const tbody = document.getElementById("tablaSucursales");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          Cargando sucursales...
        </td>
      </tr>`;
  }

  try {
    const res = await API.get("sucursales/");
    sucursalesCache = normalizarLista(res);

    renderTablaSucursales();
    renderCardsSucursales();
    configurarCambioVista();
  } catch (err) {
    console.error("Error al cargar sucursales:", err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-danger">
            Error al cargar sucursales.
          </td>
        </tr>`;
    }
  }
}

function renderTablaSucursales() {
  const tbody = document.getElementById("tablaSucursales");
  if (!tbody) return;

  if (!sucursalesCache.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          No hay sucursales registradas.
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = "";
  sucursalesCache.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.nombre || ""}</td>
      <td>${s.direccion || ""}</td>
      <td>${s.telefono || ""}</td>
      <td class="text-center">
        <a href="editar.html?id=${s.id}" class="btn btn-outline-primary btn-sm" title="Editar">
          <i class="bi bi-pencil"></i>
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCardsSucursales() {
  const cont = document.getElementById("cardsSucursales");
  if (!cont) return;

  cont.innerHTML = "";

  if (!sucursalesCache.length) {
    cont.innerHTML = `
      <div class="col-12 text-center text-muted">
        No hay sucursales registradas.
      </div>`;
    return;
  }

  sucursalesCache.forEach((s) => {
    const col = document.createElement("div");
    col.className = "col-md-4 col-sm-6";

    col.innerHTML = `
      <div class="card h-100 p-3">
        <div class="d-flex align-items-center mb-2">
          <div class="me-2">
            <i class="bi bi-geo-alt-fill fs-2 text-primary"></i>
          </div>
          <div>
            <h5 class="mb-0">${s.nombre || ""}</h5>
          </div>
        </div>
        <p class="mb-1">
          <i class="bi bi-signpost-2"></i>
          ${s.direccion || "Sin dirección"}
        </p>
        <p class="mb-1">
          <i class="bi bi-telephone"></i>
          ${s.telefono || "Sin teléfono"}
        </p>

        <div class="mt-3 d-flex justify-content-end">
          <a href="editar.html?id=${s.id}" class="btn btn-outline-primary btn-sm">
            <i class="bi bi-pencil"></i> Editar
          </a>
        </div>
      </div>
    `;

    cont.appendChild(col);
  });
}

function configurarCambioVista() {
  const btnTabla = document.getElementById("btnVistaTabla");
  const btnCards = document.getElementById("btnVistaCards");
  const vistaTabla = document.getElementById("vistaTabla");
  const vistaCards = document.getElementById("vistaCards");

  if (!btnTabla || !btnCards || !vistaTabla || !vistaCards) return;

  btnTabla.addEventListener("click", () => {
    btnTabla.classList.add("active");
    btnCards.classList.remove("active");
    vistaTabla.classList.remove("d-none");
    vistaCards.classList.add("d-none");
  });

  btnCards.addEventListener("click", () => {
    btnCards.classList.add("active");
    btnTabla.classList.remove("active");
    vistaCards.classList.remove("d-none");
    vistaTabla.classList.add("d-none");
  });
}

// ====================================================
// AGREGAR
// ====================================================
function initAgregarSucursal() {
  const form = document.getElementById("formSucursal");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const direccion = (document.getElementById("direccion")?.value || "").trim();
    const telefono = (document.getElementById("telefono")?.value || "").trim();

    if (!nombre) {
      alert("El nombre de la sucursal es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      direccion,
      telefono,
    };

    try {
      await API.post("sucursales/", payload);
      alertSuccess("Sucursal creada correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear sucursal:", err);
      alertError("No se pudo crear la sucursal.");
    }
  });
}

// ====================================================
// EDITAR
// ====================================================
async function initEditarSucursal() {
  const form = document.getElementById("formEditarSucursal");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alert("Falta el ID de la sucursal.");
    window.location.href = "listar.html";
    return;
  }

  try {
    const suc = await API.get(`sucursales/${id}/`);

    const inputId = document.getElementById("idSucursal");
    const nombre = document.getElementById("nombre");
    const direccion = document.getElementById("direccion");
    const telefono = document.getElementById("telefono");

    if (inputId) inputId.value = suc.id;
    if (nombre) nombre.value = suc.nombre || "";
    if (direccion) direccion.value = suc.direccion || "";
    if (telefono) telefono.value = suc.telefono || "";

  } catch (err) {
    console.error("Error al cargar sucursal:", err);
    alertError("No se pudo cargar la sucursal.");
    window.location.href = "listar.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const direccion = (document.getElementById("direccion")?.value || "").trim();
    const telefono = (document.getElementById("telefono")?.value || "").trim();

    if (!nombre) {
      alert("El nombre de la sucursal es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      direccion,
      telefono,
    };

    try {
      await API.put(`sucursales/${id}/`, payload);
      alertSuccess("Sucursal actualizada correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar sucursal:", err);
      alertError("No se pudo actualizar la sucursal.");
    }
  });
}
