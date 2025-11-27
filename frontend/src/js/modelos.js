// src/js/modelos.js
// CRUD frontend para Modelos (modelo + marca)
// Requiere: /src/js/api.js y JWT

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

let modelosCache = [];
let marcasMap = {}; // id -> nombre

// detectar página
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.includes("/modelos/") && path.endsWith("listar.html")) {
    initListarModelos();
  } else if (path.includes("/modelos/") && path.endsWith("agregar.html")) {
    initAgregarModelo();
  } else if (path.includes("/modelos/") && path.endsWith("editar.html")) {
    initEditarModelo();
  } else if (path.includes("/modelos/") && path.endsWith("eliminar.html")) {
    initEliminarModelo();
  }
});

// Helpers para marcas --------------------------------------

async function cargarMarcasEnSelect(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const res = await API.get("marcas/");
    const lista = Array.isArray(res) ? res : res.results || [];
    marcasMap = {};
    select.innerHTML = `<option value="">Seleccione marca...</option>`;
    lista.forEach((m) => {
      marcasMap[m.id] = m.nombre;
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.nombre;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error("Error al cargar marcas:", err);
    select.innerHTML =
      '<option value="">Error al cargar marcas</option>';
  }
}

// LISTAR ----------------------------------------------------

async function initListarModelos() {
  const inputBuscar = document.getElementById("inputBuscarModelo");
  const filtroMarca = document.getElementById("filtroMarcaModelo");
  const btnLimpiar = document.getElementById("btnLimpiarFiltrosModelo");

  // Cargar marcas para el filtro
  await cargarMarcasEnSelect("filtroMarcaModelo");

  if (inputBuscar) inputBuscar.addEventListener("input", aplicarFiltrosYRender);
  if (filtroMarca) filtroMarca.addEventListener("change", aplicarFiltrosYRender);
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (inputBuscar) inputBuscar.value = "";
      if (filtroMarca) filtroMarca.value = "";
      aplicarFiltrosYRender();
    });
  }

  cargarModelosLista();
}

async function cargarModelosLista() {
  const tbody = document.getElementById("tbodyModelos");
  if (tbody) {
    tbody.innerHTML =
      `<tr><td colspan="3" class="text-center">Cargando modelos...</td></tr>`;
  }

  try {
    const res = await API.get("modelos/");
    const lista = Array.isArray(res) ? res : res.results || [];
    modelosCache = lista;
    aplicarFiltrosYRender();
  } catch (err) {
    console.error("Error al cargar modelos:", err);
    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="3" class="text-danger text-center">Error al cargar modelos</td></tr>`;
    }
  }
}

function aplicarFiltrosYRender() {
  const inputBuscar = document.getElementById("inputBuscarModelo");
  const filtroMarca = document.getElementById("filtroMarcaModelo");

  const texto = (inputBuscar?.value || "").toLowerCase().trim();
  const marcaId = filtroMarca?.value || "";

  const filtrados = modelosCache.filter((m) => {
    const nombre = (m.nombre || "").toLowerCase();
    const marca = String(m.marca || "");
    const coincideTexto = !texto || nombre.includes(texto);
    const coincideMarca = !marcaId || marca === marcaId;
    return coincideTexto && coincideMarca;
  });

  renderTablaModelos(filtrados);
}

function renderTablaModelos(lista) {
  const tbody = document.getElementById("tbodyModelos");
  const spanTotal = document.getElementById("totalModelos");
  if (!tbody) return;

  if (spanTotal) spanTotal.textContent = lista.length;

  if (!lista.length) {
    tbody.innerHTML =
      `<tr><td colspan="3" class="text-muted text-center">No hay modelos que coincidan con el filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  lista.forEach((m) => {
    const nombre = m.nombre || "Sin nombre";
    const marcaNombre = marcasMap[m.marca] || m.marca || "Sin marca";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${nombre}</td>
      <td>${marcaNombre}</td>
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

async function initAgregarModelo() {
  const form = document.getElementById("formModelo");
  if (!form) return;

  await cargarMarcasEnSelect("marca");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const marca = document.getElementById("marca")?.value || "";

    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }
    if (!marca) {
      alertError("Debe seleccionar una marca.");
      return;
    }

    const payload = {
      nombre,
      marca: marca,
    };

    try {
      await API.post("modelos/", payload);
      alertSuccess("Modelo creado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear modelo:", err);
      alertError("No se pudo crear el modelo.");
    }
  });
}

// EDITAR ----------------------------------------------------

async function initEditarModelo() {
  const form = document.getElementById("formEditarModelo");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID del modelo.");
    window.location.href = "listar.html";
    return;
  }

  await cargarMarcasEnSelect("marca");

  // cargar datos iniciales
  try {
    const m = await API.get(`modelos/${id}/`);
    const nombre = document.getElementById("nombre");
    const marca = document.getElementById("marca");

    if (nombre) nombre.value = m.nombre || "";
    if (marca && m.marca) marca.value = m.marca;
  } catch (err) {
    console.error("Error al cargar modelo:", err);
    alertError("No se pudo cargar el modelo.");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const marca = document.getElementById("marca")?.value || "";

    if (!nombre) {
      alertError("El nombre es obligatorio.");
      return;
    }
    if (!marca) {
      alertError("Debe seleccionar una marca.");
      return;
    }

    const payload = {
      nombre,
      marca,
    };

    try {
      await API.put(`modelos/${id}/`, payload);
      alertSuccess("Modelo actualizado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar modelo:", err);
      alertError("No se pudo actualizar el modelo.");
    }
  });
}

// ELIMINAR --------------------------------------------------

async function initEliminarModelo() {
  const form = document.getElementById("formEliminarModelo");
  const infoDiv = document.getElementById("modelo-eliminar-info");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alertError("Falta el ID del modelo.");
    window.location.href = "listar.html";
    return;
  }

  try {
    // cargamos modelo y marcas para mostrar el nombre de la marca
    await cargarMarcasEnSelect("dummySelectModelosEliminar"); // select oculto opcional
    const m = await API.get(`modelos/${id}/`);
    const nombreModelo = m.nombre || "Sin nombre";
    const nombreMarca = marcasMap[m.marca] || m.marca || "Sin marca";

    if (infoDiv) {
      infoDiv.innerHTML = `
        <p>¿Seguro que deseas eliminar el modelo <strong>${nombreModelo}</strong> de la marca <strong>${nombreMarca}</strong>?</p>
        <p class="text-muted">Esta acción no se puede deshacer.</p>
      `;
    }
  } catch (err) {
    console.error("Error al cargar modelo:", err);
    if (infoDiv) {
      infoDiv.innerHTML =
        '<p class="text-danger">No se pudo cargar el modelo.</p>';
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("¿Eliminar este modelo?")) return;

    try {
      await API.delete(`modelos/${id}/`);
      alertSuccess("Modelo eliminado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar modelo:", err);
      alertError("No se pudo eliminar el modelo.");
    }
  });
}
