// src/js/marcas.js
// CRUD frontend para Marcas
// Requiere: /src/js/api.js y JWT válido en localStorage

import { API } from "/src/js/api.js";

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function alertSuccess(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: msg,
      timer: 1600,
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

let marcasCache = [];

// Detectar en qué página estamos
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.includes("/marcas/") && path.endsWith("listar.html")) {
    initListarMarcas();
  } else if (path.includes("/marcas/") && path.endsWith("agregar.html")) {
    initAgregarMarca();
  } else if (path.includes("/marcas/") && path.endsWith("editar.html")) {
    initEditarMarca();
  } else if (path.includes("/marcas/") && path.endsWith("eliminar.html")) {
    initEliminarMarca();
  }
});

// LISTAR ----------------------------------------------------

function initListarMarcas() {
  const inputBuscar = document.getElementById("inputBuscarMarca");
  const btnLimpiar = document.getElementById("btnLimpiarFiltrosMarca");

  if (inputBuscar) {
    inputBuscar.addEventListener("input", aplicarFiltrosYRender);
  }
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (inputBuscar) inputBuscar.value = "";
      aplicarFiltrosYRender();
    });
  }

  cargarMarcasLista();
}

async function cargarMarcasLista() {
  const tbody = document.getElementById("tbodyMarcas");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center">Cargando marcas...</td></tr>`;
  }

  try {
    const res = await API.get("marcas/"); // GET /api/api/marcas/
    const lista = Array.isArray(res) ? res : res.results || [];
    marcasCache = lista;

    aplicarFiltrosYRender();
  } catch (err) {
    console.error("Error al cargar marcas:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="2" class="text-danger text-center">Error al cargar marcas</td></tr>`;
    }
  }
}

function aplicarFiltrosYRender() {
  const inputBuscar = document.getElementById("inputBuscarMarca");
  const texto = (inputBuscar?.value || "").toLowerCase().trim();

  const filtradas = marcasCache.filter((m) => {
    const nombre = (m.nombre || "").toLowerCase();
    return !texto || nombre.includes(texto);
  });

  renderTablaMarcas(filtradas);
}

function renderTablaMarcas(lista) {
  const tbody = document.getElementById("tbodyMarcas");
  const spanTotal = document.getElementById("totalMarcas");
  if (!tbody) return;

  if (spanTotal) spanTotal.textContent = lista.length;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-muted text-center">No hay marcas que coincidan con el filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";
  lista.forEach((m) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${m.nombre || "Sin nombre"}</td>
      <td class="text-end">
        <a href="editar.html?id=${m.id}" class="btn btn-sm btn-outline-primary me-1">
          <i class="bi bi-pencil"></i>
        </a>
        <a href="eliminar.html?id=${m.id}" class="btn btn-sm btn-outline-danger">
          <i class="bi bi-trash"></i>
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// AGREGAR ---------------------------------------------------

function initAgregarMarca() {
  const form = document.getElementById("formMarca");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";

    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }

    const payload = { nombre };

    try {
      await API.post("marcas/", payload);
      alertSuccess("Marca creada correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear marca:", err);
      alertError("No se pudo crear la marca.");
    }
  });
}

// EDITAR ----------------------------------------------------

async function initEditarMarca() {
  const form = document.getElementById("formEditarMarca");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID de la marca.");
    window.location.href = "listar.html";
    return;
  }

  // Cargar datos actuales
  try {
    const m = await API.get(`marcas/${id}/`);
    const nombre = document.getElementById("nombre");
    if (nombre) nombre.value = m.nombre || "";
  } catch (err) {
    console.error("Error al cargar marca:", err);
    alertError("No se pudo cargar la marca.");
  }

  // Guardar cambios
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }

    const payload = { nombre };

    try {
      await API.put(`marcas/${id}/`, payload);
      alertSuccess("Marca actualizada correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar marca:", err);
      alertError("No se pudo actualizar la marca.");
    }
  });
}

// ELIMINAR --------------------------------------------------

async function initEliminarMarca() {
  const form = document.getElementById("formEliminarMarca");
  const infoDiv = document.getElementById("marca-eliminar-info");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID de la marca.");
    window.location.href = "listar.html";
    return;
  }

  try {
    const m = await API.get(`marcas/${id}/`);
    if (infoDiv) {
      infoDiv.innerHTML = `
        <p>¿Seguro que deseas eliminar la marca <strong>${m.nombre || "Sin nombre"}</strong>?</p>
        <p class="text-muted">Esta acción no se puede deshacer.</p>
      `;
    }
  } catch (err) {
    console.error("Error al cargar marca:", err);
    if (infoDiv) {
      infoDiv.innerHTML =
        '<p class="text-danger">No se pudo cargar la marca.</p>';
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("¿Eliminar esta marca?")) return;

    try {
      await API.delete(`marcas/${id}/`);
      alertSuccess("Marca eliminada correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar marca:", err);
      alertError("No se pudo eliminar la marca.");
    }
  });
}
