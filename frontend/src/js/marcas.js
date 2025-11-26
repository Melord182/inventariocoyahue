// src/js/marcas.js - NUEVO - CRUD completo para Marcas

document.addEventListener('DOMContentLoaded', () => {
    if (!window.Api) {
        console.error("Api no está definido.");
        return;
    }

    if (!Api.isAuthenticated()) {
        window.location.href = "../login/login.html";
        return;
    }

    if (document.getElementById('tablaMarcas')) {
        cargarTablaMarcas();
    }

    if (document.getElementById('formAgregarMarca')) {
        manejarFormularioAgregar();
    }

    if (document.getElementById('formEditarMarca')) {
        cargarDatosParaEditar();
        manejarFormularioEditar();
    }

    if (document.getElementById('formEliminarMarca')) {
        cargarDatosParaEliminar();
        manejarFormularioEliminar();
    }
});

async function cargarTablaMarcas() {
    const tablaBody = document.getElementById('tablaMarcas');
    tablaBody.innerHTML = '<tr><td colspan="3" class="text-center">Cargando...</td></tr>';
    
    try {
        const marcas = await Api.getMarcas();
        
        if (marcas.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="3" class="text-center">No hay marcas registradas.</td></tr>';
            return;
        }

        let filas = '';
        marcas.forEach(m => {
            filas += `
                <tr>
                  <td>${m.id}</td>
                  <td>${m.nombre}</td>
                  <td class="text-center">
                    <a href="editar.html?id=${m.id}" class="btn btn-sm btn-outline-primary" title="Editar"><i class="bi bi-pencil"></i></a>
                    <a href="eliminar.html?id=${m.id}" class="btn btn-sm btn-outline-danger" title="Eliminar"><i class="bi bi-trash"></i></a>
                  </td>
                </tr>
            `;
        });
        tablaBody.innerHTML = filas;
    } catch (error) {
        console.error("Error al cargar marcas:", error);
        tablaBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
}

function manejarFormularioAgregar() {
    const form = document.getElementById('formAgregarMarca');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        const datos = {
            nombre: document.getElementById('nombre').value
        };

        try {
            await Api.createMarca(datos);
            alert('¡Marca agregada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al agregar marca:", error);
            alert('Error al agregar marca.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Marca';
        }
    });
}

async function cargarDatosParaEditar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('ID de marca no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const marca = await Api.getMarca(id);
        
        document.getElementById('idMarca').value = marca.id;
        document.getElementById('nombre').value = marca.nombre;

    } catch (error) {
        console.error("Error al cargar marca:", error);
        alert('Error al cargar los datos de la marca.');
        window.location.href = 'listar.html';
    }
}

function manejarFormularioEditar() {
    const form = document.getElementById('formEditarMarca');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        const id = document.getElementById('idMarca').value;
        const datos = {
            nombre: document.getElementById('nombre').value
        };

        try {
            await Api.updateMarca(id, datos);
            alert('¡Marca actualizada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al actualizar marca:", error);
            alert('Error al actualizar marca.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar Cambios';
        }
    });
}

async function cargarDatosParaEliminar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    const infoDiv = document.getElementById('marca-info');
    const idInput = document.getElementById('idMarca');

    if (!id) {
        alert('ID de marca no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const marca = await Api.getMarca(id);
        
        infoDiv.innerHTML = `
            <strong>ID:</strong> ${marca.id}<br>
            <strong>Nombre:</strong> ${marca.nombre}
        `;
        idInput.value = marca.id;

    } catch (error) {
        console.error("Error al cargar marca:", error);
        infoDiv.innerHTML = 'Error al cargar datos de la marca.';
        document.querySelector('button[type="submit"]').disabled = true;
    }
}

function manejarFormularioEliminar() {
    const form = document.getElementById('formEliminarMarca');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

        const id = document.getElementById('idMarca').value;

        try {
            await Api.deleteMarca(id);
            alert('¡Marca eliminada con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al eliminar marca:", error);
            alert('Error al eliminar marca.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-trash me-2"></i>Sí, Eliminar';
        }
    });
}