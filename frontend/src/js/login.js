// src/js/login.js

// Ajusta esta URL si tu backend corre en otra IP/puerto
const AUTH_BASE_URL = "http://127.0.0.1:8000";

// Redirigir si ya hay sesión activa
document.addEventListener("DOMContentLoaded", () => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken) {
    window.location.href = "/index.html";
  }
});

document.getElementById("loginForm")?.addEventListener("submit", async function (e) {
  e.preventDefault();

  const usuarioInput = document.getElementById("usuario");
  const contrasenaInput = document.getElementById("contrasena");

  const username = usuarioInput.value.trim();
  const password = contrasenaInput.value.trim();

  if (!username || !password) {
    Swal.fire({
      icon: "warning",
      title: "Campos incompletos",
      text: "Debes ingresar usuario y contraseña"
    });
    return;
  }

  try {
    const response = await fetch(`${AUTH_BASE_URL}/api/auth/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      let mensaje = "Credenciales incorrectas";
      try {
        const data = await response.json();
        if (data.detail) mensaje = data.detail;
      } catch (_) {
        // ignorar error de parseo
      }

      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesión",
        text: mensaje
      });
      return;
    }

    const data = await response.json();

    // Guardar tokens JWT
    if (data.access) {
      localStorage.setItem("accessToken", data.access);
    }
    if (data.refresh) {
      localStorage.setItem("refreshToken", data.refresh);
    }

    // Guardar nombre de usuario para mostrar en topbar
    if (data.user && data.user.username) {
      localStorage.setItem("userLogin", data.user.username);
    } else {
      localStorage.setItem("userLogin", username);
    }

    Swal.fire({
      icon: "success",
      title: "¡Bienvenido!",
      text: "Inicio de sesión exitoso",
      showConfirmButton: false,
      timer: 1300
    }).then(() => {
      window.location.href = "/index.html";
    });

  } catch (error) {
    console.error("Error en login:", error);
    Swal.fire({
      icon: "error",
      title: "Error de conexión",
      text: "No se pudo conectar con el servidor. Revisa que el backend esté arriba."
    });
  }
});
