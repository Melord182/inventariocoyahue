// src/js/proveedores.js
// CRUD de Proveedores usando la API Django + JWT
// Funciona con:
// - paginas/proveedores/listar.html
// - paginas/proveedores/agregar.html
// - paginas/proveedores/editar.html
// - paginas/proveedores/eliminar.html
// - paginas/proveedores/detalle.html

import { API } from "/src/js/api.js";

let proveedoresCache = [];
let dataTable = null;
let grafico = null;

// ----------------------------
// Helpers
// ----------------------------

function normalizarLista(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getText(o, key, fallback = "—") {
  if (!o) return fallback;
  if (o[key] === null || o[key] === undefined || o[key] === "") return fallback;
  return o[key];
}

function alertSuccess(msg) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Éxito",
      text: msg,
      timer: 1400,
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

// ----------------------------
// Detectar página
// ----------------------------

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("tablaProveedores")) {
    initListarProveedores();
  }
  if (document.getElementById("formAgregarProveedor")) {
    initAgregarProveedor();
  }
  if (document.getElementById("formEditarProveedor")) {
    initEditarProveedor();
  }
  if (document.getElementById("formEliminarProveedor")) {
    initEliminarProveedor();
  }
  if (document.getElementById("proveedor-detalle-info")) {
    initDetalleProveedor();
  }
});

// ============================================================
// LISTAR (listar.html)
// ============================================================

async function initListarProveedores() {
  await cargarProveedoresLista();
  configurarFiltrosLista();
}

async function fetchProveedores() {
  const res = await API.get("proveedores/");
  proveedoresCache = normalizarLista(res);
}

async function cargarProveedoresLista() {
  const tbody = document.getElementById("tbodyProveedores");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center">Cargando proveedores...</td></tr>`;
  }

  try {
    await fetchProveedores();
    actualizarContador(proveedoresCache.length);
    renderTabla(proveedoresCache);
    renderGrafico(proveedoresCache);
  } catch (err) {
    console.error("Error al cargar proveedores:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error al cargar proveedores</td></tr>`;
    }
  }
}

function actualizarContador(total) {
  const el = document.getElementById("totalProveedores");
  if (el) el.innerText = total;
}

// Tabla + DataTable
function renderTabla(lista) {
  const tbody = document.getElementById("tbodyProveedores");
  if (!tbody) return;

  if (dataTable) {
    dataTable.destroy();
    dataTable = null;
  }

  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No hay proveedores</td></tr>`;
  } else {
    lista.forEach(p => {
      const nombre = getText(p, "nombre", "Sin nombre");
      const telefono = getText(p, "telefono", "");
      const email = getText(p, "email", "");
      const id = p.id;

      tbody.innerHTML += `
        <tr>
          <td>${id}</td>
          <td>${nombre}</td>
          <td>${telefono}</td>
          <td>${email}</td>
          <td class="text-center">
            <a class="btn btn-outline-info btn-icon me-1" href="detalle.html?id=${id}" title="Ver">
              <i class="bi bi-eye"></i>
            </a>
            <a class="btn btn-outline-primary btn-icon me-1" href="editar.html?id=${id}" title="Editar">
              <i class="bi bi-pencil"></i>
            </a>
            <a class="btn btn-outline-danger btn-icon" href="eliminar.html?id=${id}" title="Eliminar">
              <i class="bi bi-trash"></i>
            </a>
          </td>
        </tr>
      `;
    });
  }

  // Inicializar DataTable si la librería está disponible
  if (window.DataTable) {
    dataTable = new DataTable("#tablaProveedores", {
      layout: {
        topStart: { buttons: ["excel", "pdf"] },
      },
      language: {
        url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json",
      },
    });
  }
}

// Filtros
function configurarFiltrosLista() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroEmail = document.getElementById("filtroEmail");
  const filtroTelefono = document.getElementById("filtroTelefono");
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");

  const aplicar = () => aplicarFiltrosLista();

  if (filtroNombre) filtroNombre.addEventListener("input", aplicar);
  if (filtroEmail) filtroEmail.addEventListener("input", aplicar);
  if (filtroTelefono) filtroTelefono.addEventListener("input", aplicar);
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (filtroNombre) filtroNombre.value = "";
      if (filtroEmail) filtroEmail.value = "";
      if (filtroTelefono) filtroTelefono.value = "";
      aplicarFiltrosLista();
    });
  }
}

function aplicarFiltrosLista() {
  const filtroNombre = document.getElementById("filtroNombre");
  const filtroEmail = document.getElementById("filtroEmail");
  const filtroTelefono = document.getElementById("filtroTelefono");

  const nom = (filtroNombre?.value || "").toLowerCase();
  const mail = (filtroEmail?.value || "").toLowerCase();
  const tel = (filtroTelefono?.value || "").toLowerCase();

  const filtrados = proveedoresCache.filter(p => {
    const nombre = (p.nombre || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    const telefono = (p.telefono || "").toLowerCase();

    return (
      nombre.includes(nom) &&
      email.includes(mail) &&
      telefono.includes(tel)
    );
  });

  actualizarContador(filtrados.length);
  renderTabla(filtrados);
  renderGrafico(filtrados);
}

// Gráfico
function renderGrafico(lista) {
  const canvas = document.getElementById("graficoProveedores");
  if (!canvas || !window.Chart) return;

  const iniciales = {};
  lista.forEach(p => {
    const nombre = p.nombre || "";
    const ini = nombre.charAt(0).toUpperCase() || "?";
    iniciales[ini] = (iniciales[ini] || 0) + 1;
  });

  const labels = Object.keys(iniciales);
  const values = Object.values(iniciales);

  if (grafico) grafico.destroy();

  grafico = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          data: values,
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ============================================================
// AGREGAR (agregar.html)
// ============================================================
function initAgregarProveedor() {
  const form = document.getElementById("formAgregarProveedor");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const rut = (document.getElementById("rut")?.value || "").trim();
    const nombreLegal = (document.getElementById("nombre_legal")?.value || "").trim();
    const ubicacion = (document.getElementById("ubicacion")?.value || "").trim();

    // 👇 Intentamos varios IDs posibles
    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_proveedor");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("telefonoProveedor");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    const contacto = (contactoInput?.value || "").trim();
    const telefono = (telefonoInput?.value || "").trim();
    const correo = (correoInput?.value || "").trim();

    // 🔹 SOLO obligamos nombre y rut en el front
    if (!nombre || !rut) {
      alert("Nombre y RUT son obligatorios.");
      return;
    }

    const payload = {
      nombre,
      rut,
      nombre_legal: nombreLegal || "",
      ubicacion: ubicacion || "",
      contacto: contacto || "",
      telefono: telefono || "",
      correo: correo || "",
    };

    try {
      await API.post("proveedores/", payload);
      alertSuccess("Proveedor creado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear proveedor:", err);
      alertError("No se pudo crear el proveedor. " + (err.message || ""));
    }
  });
}

// ============================================================
// EDITAR (editar.html)
// ============================================================
// Cargar datos del proveedor en el formulario de edición
async function cargarProveedorEdicion(id) {
  try {
    const p = await API.get(`proveedores/${id}/`);

    const inputId = document.getElementById("idProveedor");
    const nombre = document.getElementById("nombre");
    const rut = document.getElementById("rut");
    const nombreLegal = document.getElementById("nombre_legal");
    const ubicacion = document.getElementById("ubicacion");

    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_proveedor");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("telefonoProveedor");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    if (inputId) inputId.value = p.id;
    if (nombre) nombre.value = p.nombre || "";
    if (rut) rut.value = p.rut || "";
    if (nombreLegal) nombreLegal.value = p.nombre_legal || "";
    if (ubicacion) ubicacion.value = p.ubicacion || "";

    if (contactoInput) contactoInput.value = p.contacto || "";
    if (telefonoInput) telefonoInput.value = p.telefono || "";
    if (correoInput) correoInput.value = p.correo || "";
  } catch (err) {
    console.error("Error al cargar proveedor para editar:", err);
    alertError("No se pudo cargar el proveedor.");
  }
}

function initEditarProveedor() {
  const form = document.getElementById("formEditarProveedor");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del proveedor.");
    window.location.href = "listar.html";
    return;
  }

  cargarProveedorEdicion(id);

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const rut = (document.getElementById("rut")?.value || "").trim();
    const nombreLegal = (document.getElementById("nombre_legal")?.value || "").trim();
    const ubicacion = (document.getElementById("ubicacion")?.value || "").trim();

    const contactoInput =
      document.getElementById("contacto") ||
      document.getElementById("nombreContacto") ||
      document.getElementById("contacto_proveedor");

    const telefonoInput =
      document.getElementById("telefono") ||
      document.getElementById("telefonoProveedor");

    const correoInput =
      document.getElementById("correo") ||
      document.getElementById("email") ||
      document.getElementById("correo_electronico");

    const contacto = (contactoInput?.value || "").trim();
    const telefono = (telefonoInput?.value || "").trim();
    const correo = (correoInput?.value || "").trim();

    if (!nombre || !rut) {
      alert("Nombre y RUT son obligatorios.");
      return;
    }

    const payload = {
      nombre,
      rut,
      nombre_legal: nombreLegal || "",
      ubicacion: ubicacion || "",
      contacto: contacto || "",
      telefono: telefono || "",
      correo: correo || "",
    };

    try {
      await API.put(`proveedores/${id}/`, payload);
      alertSuccess("Proveedor actualizado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar proveedor:", err);
      alertError("No se pudo actualizar el proveedor. " + (err.message || ""));
    }
  });
}

// ============================================================
// ELIMINAR (eliminar.html)
// ============================================================

function initEliminarProveedor() {
  const form = document.getElementById("formEliminarProveedor");
  const infoDiv = document.getElementById("proveedor-info");
  if (!form || !infoDiv) return;

  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del proveedor.");
    window.location.href = "listar.html";
    return;
  }

  // Mostrar datos
  API.get(`proveedores/${id}/`)
    .then(p => {
      const nombre = getText(p, "nombre", "Sin nombre");
      const rut = getText(p, "rut", "—");
      const ubicacion = getText(p, "ubicacion", "—");

      infoDiv.innerHTML = `
        <div class="bg-light p-3 rounded border">
          <p class="mb-1"><strong>${nombre}</strong></p>
          <p class="mb-1">RUT: ${rut}</p>
          <p class="mb-0">Ubicación: ${ubicacion}</p>
        </div>
      `;

      const hiddenId = document.getElementById("idProveedor");
      if (hiddenId) hiddenId.value = p.id;
    })
    .catch(err => {
      console.error("Error al cargar proveedor:", err);
      infoDiv.textContent = "No se pudo cargar el proveedor.";
    });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!confirm("¿Seguro que deseas eliminar este proveedor?")) return;

    try {
      await API.delete(`proveedores/${id}/`);
      alertSuccess("Proveedor eliminado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar proveedor:", err);
      alertError("No se pudo eliminar el proveedor.");
    }
  });
}

// ============================================================
// DETALLE (detalle.html)
// ============================================================

function initDetalleProveedor() {
  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del proveedor.");
    window.location.href = "listar.html";
    return;
  }

  cargarDetalleProveedor(id);
}

async function cargarDetalleProveedor(id) {
  const dl = document.getElementById("proveedor-detalle-info");
  const btnEditar = document.getElementById("btn-editar-proveedor");
  if (!dl) return;

  try {
    const p = await API.get(`proveedores/${id}/`);

    const nombre = getText(p, "nombre", "Sin nombre");
    const rut = getText(p, "rut", "—");
    const nombreLegal = getText(p, "nombre_legal", "—");
    const ubicacion = getText(p, "ubicacion", "—");
    const telefono = getText(p, "telefono", "—");
    const email = getText(p, "email", "—");

    dl.innerHTML = `
      <dt class="col-sm-4">ID Proveedor</dt>
      <dd class="col-sm-8">${p.id}</dd>

      <dt class="col-sm-4">Nombre</dt>
      <dd class="col-sm-8">${nombre}</dd>

      <dt class="col-sm-4">RUT Empresa</dt>
      <dd class="col-sm-8">${rut}</dd>

      <dt class="col-sm-4">Nombre Legal</dt>
      <dd class="col-sm-8">${nombreLegal}</dd>

      <dt class="col-sm-4">Ubicación</dt>
      <dd class="col-sm-8">${ubicacion}</dd>

      <dt class="col-sm-4">Teléfono</dt>
      <dd class="col-sm-8">${telefono}</dd>

      <dt class="col-sm-4">Email</dt>
      <dd class="col-sm-8">${email}</dd>
    `;

    if (btnEditar) {
      btnEditar.href = `editar.html?id=${p.id}`;
    }
  } catch (err) {
    console.error("Error al cargar detalle de proveedor:", err);
    dl.innerHTML = `<dt class="col-sm-4 text-danger">Error</dt><dd class="col-sm-8">No se pudo cargar el proveedor.</dd>`;
  }
}
