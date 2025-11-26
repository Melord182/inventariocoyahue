// src/js/modelos.js - NUEVO - CRUD completo para Modelos

document.addEventListener('DOMContentLoaded', async () => {
    if (!window.Api) {
        console.error("Api no está definido.");
        return;
    }

    if (!Api.isAuthenticated()) {
        window.location.href = "../login/login.html";
        return;
    }

    if (document.getElementById('tablaModelos')) {
        cargarTablaModelos();
    }

    if (document.getElementById('formAgregarModelo')) {
        await cargarMarcas();
        manejarFormularioAgregar();
    }

    if (document.getElementById('formEditarModelo')) {
        await cargarMarcas();
        cargarDatosParaEditar();
        manejarFormularioEditar();
    }

    if (document.getElementById('formEliminarModelo')) {
        cargarDatosParaEliminar();
        manejarFormularioEliminar();
    }
});

async function cargarMarcas() {
    try {
        const marcas = await Api.getMarcas();
        const selectMarca = document.getElementById('marca');
        
        if (selectMarca) {
            selectMarca.innerHTML = '<option value="">Seleccione una marca</option>';
            marcas.forEach(marca => {
                selectMarca.innerHTML += `<option value="${marca.id}">${marca.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error("Error al cargar marcas:", error);
    }
}

async function cargarTablaModelos() {
    const tablaBody = document.getElementById('tablaModelos');
    tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">Cargando...</td></tr>';
    
    try {
        const modelos = await Api.getModelos();
        
        if (modelos.length === 0) {
            tablaBody.innerHTML = '<tr><td colspan="4" class="text-center">No hay modelos registrados.</td></tr>';
            return;
        }

        let filas = '';
        modelos.forEach(m => {
            filas += `
                <tr>
                  <td>${m.id}</td>
                  <td>${m.marca_nombre || 'N/A'}</td>
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
        console.error("Error al cargar modelos:", error);
        tablaBody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error al cargar datos.</td></tr>';
    }
}

function manejarFormularioAgregar() {
    const form = document.getElementById('formAgregarModelo');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        const datos = {
            marca: document.getElementById('marca').value,
            nombre: document.getElementById('nombre').value
        };

        try {
            await Api.createModelo(datos);
            alert('¡Modelo agregado con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al agregar modelo:", error);
            alert('Error al agregar modelo.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-check-circle me-2"></i>Guardar Modelo';
        }
    });
}

async function cargarDatosParaEditar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('ID de modelo no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const modelo = await Api.getModelo(id);
        
        document.getElementById('idModelo').value = modelo.id;
        document.getElementById('marca').value = modelo.marca;
        document.getElementById('nombre').value = modelo.nombre;

    } catch (error) {
        console.error("Error al cargar modelo:", error);
        alert('Error al cargar los datos del modelo.');
        window.location.href = 'listar.html';
    }
}

function manejarFormularioEditar() {
    const form = document.getElementById('formEditarModelo');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        const id = document.getElementById('idModelo').value;
        const datos = {
            marca: document.getElementById('marca').value,
            nombre: document.getElementById('nombre').value
        };

        try {
            await Api.updateModelo(id, datos);
            alert('¡Modelo actualizado con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al actualizar modelo:", error);
            alert('Error al actualizar modelo.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-save me-2"></i>Actualizar Cambios';
        }
    });
}

async function cargarDatosParaEliminar() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    
    const infoDiv = document.getElementById('modelo-info');
    const idInput = document.getElementById('idModelo');

    if (!id) {
        alert('ID de modelo no encontrado.');
        window.location.href = 'listar.html';
        return;
    }

    try {
        const modelo = await Api.getModelo(id);
        
        infoDiv.innerHTML = `
            <strong>ID:</strong> ${modelo.id}<br>
            <strong>Marca:</strong> ${modelo.marca_nombre}<br>
            <strong>Nombre:</strong> ${modelo.nombre}
        `;
        idInput.value = modelo.id;

    } catch (error) {
        console.error("Error al cargar modelo:", error);
        infoDiv.innerHTML = 'Error al cargar datos del modelo.';
        document.querySelector('button[type="submit"]').disabled = true;
    }
}

function manejarFormularioEliminar() {
    const form = document.getElementById('formEliminarModelo');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const boton = form.querySelector('button[type="submit"]');
        boton.disabled = true;
        boton.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Eliminando...';

        const id = document.getElementById('idModelo').value;

        try {
            await Api.deleteModelo(id);
            alert('¡Modelo eliminado con éxito!');
            window.location.href = 'listar.html';
        } catch (error) {
            console.error("Error al eliminar modelo:", error);
            alert('Error al eliminar modelo.');
            boton.disabled = false;
            boton.innerHTML = '<i class="bi bi-trash me-2"></i>Sí, Eliminar';
        }
    });
}