// src/js/sucursales.js - NUEVO - CRUD completo para Sucursales

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Api) {
        console.error("Api no está definido.");
        return;
    }

    if (!Api.isAuthenticated()) {
        window.location.href = "../login/login.html";
        return;
    }

    if (document.getElementById('tablaSucursales')) {
        cargarTablaSucursales();
    }

    if (document.getElementById('formAgregarSucursal')) {
        manejarFormularioAgregar();
    }

    if (document.getElementById('formEditarSucursal')) {
        cargarDatosParaEditar();
        manejarFormularioEditar();
    }

    if (document.getElementById('formEliminarSucursal')) {
        cargarDatosParaEliminar();
        manejarFormularioEliminar();
    }
});

async function cargarTablaSucursales() {
    const tablaBody = document.getElementById('tablaSucursales');
    tablaBody.innerHTML = '<tr><td colspan="5" class="text-center">Cargando...</td></tr>';
    
    try {
        const sucursales = await Api.getSucursales();
        
        if (sucursales.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="5" class="text-center">No hay sucursales registradas.</td></tr>';
            return;
        }

        let filas = '';
        sucursales.forEach(s => {
            filas += `
                <tr>
                  <td>${s.id}</td>
                  <td>${s.nombre}</td>
                  <td>${s.direccion || 'N/A'}</td>
                  <td>${s.telefono || 'N/A'}</td>
                  <td class="text-center">
                    <a href="editar.html?id=${s.id}" class="btn btn-sm btn-outline-primary" title="Editar"><i class="bi bi-pencil"></i></a>
                    <a href="eliminar.html?id=${s.id}" class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash"></i></a>
                  </td>
                </tr>
            `;
        });
        tablaBody.innerHTML = filas;
    } catch (error) {
        console.error("Error al cargar sucursales:", error);
        tablaBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
}

function manejarFormularioAgregar() {
    const form = document.getElementById('formAgregarSucursal');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        const datos = {
            nombre: document.getElementById('nombre').value,
            direccion: document.getElementById('direccion').value,
            telefono: document.getElementById('telefono').value
        };

        try {
            await Api.createSucursal(datos);
            alert('¡Sucursal agregada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al agregar sucursal:", error);
            alert('Error al agregar sucursal.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Sucursal';
        }
    });
}

async function cargarDatosParaEditar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('ID de sucursal no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const sucursal = await Api.getSucursal(id);
        
        document.getElementById('idSucursal').value = sucursal.id;
        document.getElementById('nombre').value = sucursal.nombre;
        document.getElementById('direccion').value = sucursal.direccion || '';
        document.getElementById('telefono').value = sucursal.telefono || '';

    } catch (error) {
        console.error("Error al cargar sucursal:", error);
        alert('Error al cargar los datos de la sucursal.');
        window.location.href = 'listar.html';
    }
}

function manejarFormularioEditar() {
    const form = document.getElementById('formEditarSucursal');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        const id = document.getElementById('idSucursal').value;
        const datos = {
            nombre: document.getElementById('nombre').value,
            direccion: document.getElementById('direccion').value,
            telefono: document.getElementById('telefono').value
        };

        try {
            await Api.updateSucursal(id, datos);
            alert('¡Sucursal actualizada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al actualizar sucursal:", error);
            alert('Error al actualizar sucursal.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar Cambios';
        }
    });
}

async function cargarDatosParaEliminar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    const infoDiv = document.getElementById('sucursal-info');
    const idInput = document.getElementById('idSucursal');

    if (!id) {
        alert('ID de sucursal no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const sucursal = await Api.getSucursal(id);
        
        infoDiv.innerHTML = `
            <strong>ID:</strong> ${sucursal.id}<br>
            <strong>Nombre:</strong> ${sucursal.nombre}<br>
            <strong>Dirección:</strong> ${sucursal.direccion || 'N/A'}<br>
            <strong>Teléfono:</strong> ${sucursal.telefono || 'N/A'}
        `;
        idInput.value = sucursal.id;

    } catch (error) {
        console.error("Error al cargar sucursal:", error);
        infoDiv.innerHTML = 'Error al cargar datos de la sucursal.';
        document.querySelector('button[type="submit"]').disabled = true;
    }
}

function manejarFormularioEliminar() {
    const form = document.getElementById('formEliminarSucursal');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

        const id = document.getElementById('idSucursal').value;

        try {
            await Api.deleteSucursal(id);
            alert('¡Sucursal eliminada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al eliminar sucursal:", error);
            alert('Error al eliminar sucursal.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-trash me-2"></i>Sí, Eliminar';
        }
    });
}