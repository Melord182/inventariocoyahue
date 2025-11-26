// ✅ Módulo para manejo de ajustes (perfil y contraseña)

// --- Perfil ---
document.addEventListener("DOMContentLoaded", () => {
  const formPerfil = document.getElementById("formPerfil");
  if (formPerfil) {
    formPerfil.addEventListener("submit", (e) => {
      e.preventDefault();

      const nombre = document.getElementById("nombre").value.trim();
      const email = document.getElementById("email").value.trim();
      const telefono = document.getElementById("telefono").value.trim();
      const cargo = document.getElementById("cargo").value.trim();

      if (!nombre || !email) {
        mostrarMensaje("Por favor completa los campos requeridos.", "danger");
        return;
      }

      // Aquí podrías enviar los datos a un backend usando fetch()
      mostrarMensaje("✅ Perfil actualizado correctamente.", "success");
      console.log("Datos actualizados:", { nombre, email, telefono, cargo });
    });
  }

  // --- Cambio de contraseña ---
  const formPass = document.getElementById("formContraseña");
  if (formPass) {
    formPass.addEventListener("submit", (e) => {
      e.preventDefault();

      const actual = document.getElementById("actual").value.trim();
      const nueva = document.getElementById("nueva").value.trim();
      const confirmar = document.getElementById("confirmar").value.trim();

      if (!actual || !nueva || !confirmar) {
        mostrarMensaje("Todos los campos son obligatorios.", "danger");
        return;
      }

      if (nueva !== confirmar) {
        mostrarMensaje("Las contraseñas no coinciden.", "warning");
        return;
      }

      // Aquí podrías hacer la petición al backend
      mostrarMensaje("🔒 Contraseña cambiada correctamente.", "success");
      formPass.reset();
    });
  }
});

// --- Función genérica para mostrar mensajes ---
function mostrarMensaje(texto, tipo = "info") {
  const contenedor = document.createElement("div");
  contenedor.className = `alert alert-${tipo} text-center mt-3`;
  contenedor.textContent = texto;
  document.querySelector("main")?.prepend(contenedor);

  setTimeout(() => contenedor.remove(), 3000);
}
