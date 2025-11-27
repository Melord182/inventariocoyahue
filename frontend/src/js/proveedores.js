// src/js/proveedores.js
// Frontend CRUD para Proveedores (lista, filtro, crear, editar, eliminar)
// Requiere: /src/js/api.js que exporta { API } y JWT válido en localStorage.

import { API } from "/src/js/api.js";

// -----------------------------------------------------------
// Utilidades generales
// -----------------------------------------------------------

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function normalizarProveedor(p) {
  if (!p || typeof p !== "object") return {};
  return {
    id: p.id,
    nombre: p.nombre || p.nombre_fantasia || "",
    rut: p.rut || p.rut_empresa || "",
    contacto: p.contacto || p.nombre_contacto || "",
    telefono: p.telefono || p.fono || "",
    email: p.email || p.correo || p.correo_electronico || "",
    ubicacion: p.ubicacion || p.direccion || "",
  };
}

let proveedoresCache = []; // lista completa desde la API

// -----------------------------------------------------------
// DETECCIÓN DE PÁGINA
// -----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  if (path.includes("/proveedores/") && path.endsWith("listar.html")) {
    initListarProveedores();
  } else if (path.includes("/proveedores/") && path.endsWith("agregar.html")) {
    initAgregarProveedor();
  } else if (path.includes("/proveedores/") && path.endsWith("editar.html")) {
    initEditarProveedor();
  } else if (path.includes("/proveedores/") && path.endsWith("eliminar.html")) {
    initEliminarProveedor();
  } else if (path.includes("/proveedores/") && path.endsWith("detalle.html")) {
    initDetalleProveedor();
  }
});

// -----------------------------------------------------------
// LISTAR (proveedores/listar.html)
// -----------------------------------------------------------

function initListarProveedores() {
  const inputBuscar = document.getElementById("inputBuscarProveedor");
  const filtroEmail = document.getElementById("filtroEmailProveedor");
  const filtroTelefono = document.getElementById("filtroTelefonoProveedor");
  const btnLimpiar = document.getElementById("btnLimpiarFiltrosProveedor");

  const recargar = () => aplicarFiltrosYRender();

  if (inputBuscar) inputBuscar.addEventListener("input", recargar);
  if (filtroEmail) filtroEmail.addEventListener("input", recargar);
  if (filtroTelefono) filtroTelefono.addEventListener("input", recargar);
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      if (inputBuscar) inputBuscar.value = "";
      if (filtroEmail) filtroEmail.value = "";
      if (filtroTelefono) filtroTelefono.value = "";
      aplicarFiltrosYRender();
    });
  }

  cargarProveedoresLista();
}

async function cargarProveedoresLista() {
  const tbody = document.getElementById("tbodyProveedores");

  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="6">Cargando proveedores...</td></tr>`;
  }

  try {
    const res = await API.get("proveedores/"); // GET /api/api/proveedores/
    const lista = Array.isArray(res) ? res : (res.results || []);
    proveedoresCache = lista.map(normalizarProveedor);

    aplicarFiltrosYRender();
  } catch (err) {
    console.error("Error al cargar proveedores:", err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-danger">Error al cargar proveedores</td></tr>`;
    }
  }
}

function aplicarFiltrosYRender() {
  const inputBuscar = document.getElementById("inputBuscarProveedor");
  const filtroEmail = document.getElementById("filtroEmailProveedor");
  const filtroTelefono = document.getElementById("filtroTelefonoProveedor");

  const texto = (inputBuscar?.value || "").toLowerCase().trim();
  const emailFiltro = (filtroEmail?.value || "").toLowerCase().trim();
  const telFiltro = (filtroTelefono?.value || "").toLowerCase().trim();

  const filtrados = proveedoresCache.filter((p) => {
    const nombre = (p.nombre || "").toLowerCase();
    const rut = (p.rut || "").toLowerCase();
    const contacto = (p.contacto || "").toLowerCase();
    const email = (p.email || "").toLowerCase();
    const tel = (p.telefono || "").toLowerCase();

    const coincideTexto =
      !texto ||
      nombre.includes(texto) ||
      rut.includes(texto) ||
      contacto.includes(texto);

    const coincideEmail = !emailFiltro || email.includes(emailFiltro);
    const coincideTel = !telFiltro || tel.includes(telFiltro);

    return coincideTexto && coincideEmail && coincideTel;
  });

  renderTablaProveedores(filtrados);
}

function renderTablaProveedores(lista) {
  const tbody = document.getElementById("tbodyProveedores");
  const spanTotal = document.getElementById("totalProveedores");
  if (!tbody) return;

  if (spanTotal) spanTotal.textContent = lista.length;

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-muted text-center">No hay proveedores que coincidan con el filtro.</td></tr>`;
    return;
  }

  tbody.innerHTML = "";

  lista.forEach((p) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.nombre || "Sin nombre"}</td>
      <td>${p.rut || "—"}</td>
      <td>${p.contacto || "—"}</td>
      <td>${p.telefono || "—"}</td>
      <td>${p.email || "—"}</td>
      <td class="text-end">
        <a href="detalle.html?id=${p.id}" class="btn btn-sm btn-outline-info me-1">
          <i class="bi bi-eye"></i>
        </a>
        <a href="editar.html?id=${p.id}" class="btn btn-sm btn-outline-primary me-1">
          <i class="bi bi-pencil"></i>
        </a>
        <a href="eliminar.html?id=${p.id}" class="btn btn-sm btn-outline-danger">
          <i class="bi bi-trash"></i>
        </a>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

// -----------------------------------------------------------
// AGREGAR (proveedores/agregar.html)
// -----------------------------------------------------------

function initAgregarProveedor() {
  const form = document.getElementById("formProveedor");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const rut = document.getElementById("rut")?.value.trim() || "";
    const contacto =
      document.getElementById("contacto")?.value.trim() || "";
    const telefono =
      document.getElementById("telefono")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const ubicacion =
      document.getElementById("ubicacion")?.value.trim() || "";

    if (!nombre) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (!contacto) {
      alert("El contacto es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      rut,
      contacto,
      telefono,
      email,
      ubicacion,
    };

    try {
      await API.post("proveedores/", payload);
      alert("Proveedor creado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al crear proveedor:", err);
      alert("No se pudo crear el proveedor. Revisa los datos.");
    }
  });
}

// -----------------------------------------------------------
// EDITAR (proveedores/editar.html)
// -----------------------------------------------------------

async function initEditarProveedor() {
  const form = document.getElementById("formEditarProveedor");
  if (!form) return;

  const id = getParam("id");
  if (!id) {
    alert("Falta el ID del proveedor.");
    window.location.href = "listar.html";
    return;
  }

  // Cargar datos iniciales
  try {
    const p = await API.get(`proveedores/${id}/`);
    const n = normalizarProveedor(p);

    const nombre = document.getElementById("nombre");
    const rut = document.getElementById("rut");
    const contacto = document.getElementById("contacto");
    const telefono = document.getElementById("telefono");
    const email = document.getElementById("email");
    const ubicacion = document.getElementById("ubicacion");

    if (nombre) nombre.value = n.nombre;
    if (rut) rut.value = n.rut;
    if (contacto) contacto.value = n.contacto;
    if (telefono) telefono.value = n.telefono;
    if (email) email.value = n.email;
    if (ubicacion) ubicacion.value = n.ubicacion;
  } catch (err) {
    console.error("Error al cargar proveedor:", err);
    alert("No se pudo cargar la información del proveedor.");
  }

  // Enviar cambios
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nombre")?.value.trim() || "";
    const rut = document.getElementById("rut")?.value.trim() || "";
    const contacto =
      document.getElementById("contacto")?.value.trim() || "";
    const telefono =
      document.getElementById("telefono")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const ubicacion =
      document.getElementById("ubicacion")?.value.trim() || "";

    if (!nombre) {
      alert("El nombre es obligatorio.");
      return;
    }
    if (!contacto) {
      alert("El contacto es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      rut,
      contacto,
      telefono,
      email,
      ubicacion,
    };

    try {
      await API.put(`proveedores/${id}/`, payload);
      alert("Proveedor actualizado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al actualizar proveedor:", err);
      alert("No se pudo actualizar el proveedor.");
    }
  });
}

// -----------------------------------------------------------
// ELIMINAR (proveedores/eliminar.html)
// -----------------------------------------------------------

function initEliminarProveedor() {
  const form = document.getElementById("formEliminarProveedor");
  const infoDiv = document.getElementById("proveedor-eliminar-info");
  const id = getParam("id");

  if (!form || !id) return;

  // Mostrar un resumen
  API.get(`proveedores/${id}/`)
    .then((p) => {
      const n = normalizarProveedor(p);
      if (infoDiv) {
        infoDiv.innerHTML = `
          <p><strong>${n.nombre || "Sin nombre"}</strong></p>
          <p>RUT: ${n.rut || "—"}</p>
          <p>Contacto: ${n.contacto || "—"}</p>
          <p>Teléfono: ${n.telefono || "—"}</p>
          <p>Email: ${n.email || "—"}</p>
        `;
      }
    })
    .catch((err) => {
      console.error("Error al cargar proveedor a eliminar:", err);
      if (infoDiv) {
        infoDiv.textContent = "No se pudo cargar la información del proveedor.";
      }
    });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!confirm("¿Seguro que quieres eliminar este proveedor?")) return;

    try {
      await API.delete(`proveedores/${id}/`);
      alert("Proveedor eliminado correctamente.");
      window.location.href = "listar.html";
    } catch (err) {
      console.error("Error al eliminar proveedor:", err);
      alert("No se pudo eliminar el proveedor.");
    }
  });
}

// -----------------------------------------------------------
// DETALLE (proveedores/detalle.html)
// -----------------------------------------------------------

async function initDetalleProveedor() {
  const cont = document.getElementById("proveedor-detalle-info");
  const id = getParam("id");
  if (!cont || !id) return;

  cont.innerHTML = "<p>Cargando...</p>";

  try {
    const p = await API.get(`proveedores/${id}/`);
    const n = normalizarProveedor(p);

    cont.innerHTML = `
      <p><strong>${n.nombre || "Sin nombre"}</strong></p>
      <p>RUT: ${n.rut || "—"}</p>
      <p>Contacto: ${n.contacto || "—"}</p>
      <p>Teléfono: ${n.telefono || "—"}</p>
      <p>Email: ${n.email || "—"}</p>
      <p>Ubicación: ${n.ubicacion || "—"}</p>
    `;

    const btnEditar = document.getElementById("btnEditarProveedor");
    if (btnEditar) {
      btnEditar.href = `editar.html?id=${n.id}`;
    }
  } catch (err) {
    console.error("Error al cargar detalle del proveedor:", err);
    cont.innerHTML =
      '<p class="text-danger">No se pudo cargar el proveedor.</p>';
  }
}
