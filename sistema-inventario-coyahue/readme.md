# Sistema de Inventario de Activos Tecnológicos - Grupo Coyahue

## 📋 Descripción
Sistema web de gestión de inventario de activos tecnológicos desarrollado para el Grupo Coyahue.

## 👥 Equipo
- **Lucas Gutiérrez**: Backend, Base de Datos, AWS
- **María José Antilef**: Frontend, UX/UI
- **Jaime López**: Backend, UX/UI

## 🛠️ Tecnologías
- **Frontend**: React.js, Bootstrap, Axios
- **Backend**: Django 4.2, Django REST Framework
- **Base de Datos**: MySQL 8.0
- **Infraestructura**: AWS (EC2, RDS, S3)

## 🚀 Estructura Proyecto

```bash

sistema-inventario-coyahue/
│
├── 📁 docs/                          # Documentación del proyecto
│   ├── informes/
│   │   ├── informe_1_diagnostico.pdf
│   │   ├── informe_2_diseño.pdf
│   │   └── informe_final.pdf
│   ├── diagramas/
│   │   ├── casos_uso.png
│   │   ├── clases.png
│   │   ├── actividad.png
│   │   ├── componentes.png
│   │   ├── despliegue.png
│   │   └── modelo_er.png
│   ├── prototipos/
│   │   └── figma_link.txt
│   └── plan_pruebas.md
│
├── 📁 backend/                       # Aplicación Django
│   ├── inventario_project/          # Proyecto Django principal
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── apps/                        # Aplicaciones Django
│   │   ├── productos/
│   │   │   ├── migrations/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── views.py
│   │   │   ├── serializers.py
│   │   │   ├── urls.py
│   │   │   └── tests.py
│   │   ├── usuarios/
│   │   ├── proveedores/
│   │   ├── categorias/
│   │   ├── asignaciones/
│   │   ├── mantenimientos/
│   │   └── notificaciones/
│   ├── static/                      # Archivos estáticos backend
│   ├── media/                       # Archivos subidos (desarrollo)
│   ├── requirements.txt             # Dependencias Python
│   ├── manage.py
│   └── .env.example                 # Variables de entorno ejemplo
│
├── 📁 frontend/                     # Aplicación React
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/             # Componentes reutilizables
│   │   │   ├── Navbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Table.jsx
│   │   │   └── Modal.jsx
│   │   ├── pages/                  # Páginas/vistas principales
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Productos.jsx
│   │   │   ├── Proveedores.jsx
│   │   │   ├── Categorias.jsx
│   │   │   ├── Reportes.jsx
│   │   │   ├── Notificaciones.jsx
│   │   │   └── Ajustes.jsx
│   │   ├── services/               # Servicios API (Axios)
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   ├── productosService.js
│   │   │   └── proveedoresService.js
│   │   ├── context/                # Context API (estado global)
│   │   │   ├── AuthContext.jsx
│   │   │   └── AppContext.jsx
│   │   ├── utils/                  # Utilidades
│   │   │   ├── validators.js
│   │   │   ├── formatters.js
│   │   │   └── constants.js
│   │   ├── styles/                 # Estilos CSS
│   │   │   └── main.css
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── routes.js
│   ├── package.json
│   ├── package-lock.json
│   └── .env.example
│
├── 📁 database/                     # Scripts de base de datos
│   ├── schema.sql                  # Schema inicial
│   ├── migrations/
│   │   └── 001_create_tables.sql
│   ├── seeds/                      # Datos iniciales
│   │   └── initial_data.sql
│   └── backup/
│       └── .gitkeep
│
├── 📁 tests/                        # Pruebas
│   ├── unit/                       # Pruebas unitarias
│   │   ├── test_productos.py
│   │   └── test_usuarios.py
│   ├── integration/                # Pruebas de integración
│   │   └── test_api_productos.py
│   └── e2e/                        # Pruebas end-to-end
│       └── test_flujo_completo.py
│
├── 📁 deployment/                   # Configuración de despliegue
│   ├── docker/
│   │   ├── Dockerfile.backend
│   │   ├── Dockerfile.frontend
│   │   └── docker-compose.yml
│   ├── nginx/
│   │   └── nginx.conf
│   ├── aws/
│   │   ├── ec2_setup.sh
│   │   └── rds_config.md
│   └── scripts/
│       ├── deploy.sh
│       └── backup.sh
│
├── 📁 .github/                      # Configuración GitHub
│   └── workflows/
│       ├── ci.yml                  # Integración continua
│       └── deploy.yml              # Deploy automático
│
├── .gitignore                       # Archivos ignorados por Git
├── README.md                        # Documentación principal
├── LICENSE                          # Licencia del proyecto
└── CONTRIBUTING.md                  # Guía de contribución