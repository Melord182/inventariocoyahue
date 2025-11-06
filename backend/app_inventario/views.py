from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from datetime import date

from .models import (
    Proveedores, Marcas, Categorias, Modelos, Estados, Productos,
    Usuarios, Asignaciones, Mantenciones, HistorialEstados,
    Documentaciones, Notificaciones, LogAcceso
)
from .serializers import (
    ProveedoresSerializer, MarcasSerializer, CategoriasSerializer,
    ModelosSerializer, EstadosSerializer,
    ProductosListSerializer, ProductosDetailSerializer, ProductosCreateUpdateSerializer,
    UsuariosSerializer, UsuariosCreateSerializer,
    AsignacionesSerializer, AsignacionesCreateSerializer,
    MantencionesSerializer,
    HistorialEstadosSerializer, HistorialEstadosCreateSerializer,
    DocumentacionesSerializer, NotificacionesSerializer, LogAccesoSerializer
)

def productos(request):
    """Vista para listar productos con datos de la BD"""
    # Obtener todos los productos con sus relaciones
    productos_list = Productos.objects.select_related(
        'categoria', 'modelo', 'modelo__marca', 'estado', 'proveedor'
    ).all()
    
    context = {
        'productos': productos_list
    }
    
    return render(request, 'listar_producto.html', context)

"""

En las viewsets contaremos con tablas que contengan endpoints estándar (list, create, retrieve, update, delete)
y tendremos tablas que cuenten con otros endpoints, los cuales se ven a través de las funciones que contienen.

Cada una de las funciones cuenta con un decorador llamado 'action', este tiene por función:

El decorador action nos dice si la funcion necesita la ID(detail) y qué método utilizará. Sirve para crear nuevos endpoints.

"""

# ============= VIEWSETS TABLAS BÁSICAS =============

class ProveedoresViewSet(viewsets.ModelViewSet):

    """ViewSet para gestionar Proveedores"""
    queryset = Proveedores.objects.all()
    serializer_class = ProveedoresSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'rut', 'contacto']
    ordering_fields = ['nombre', 'rut']
    ordering = ['nombre']


class MarcasViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Marcas"""
    queryset = Marcas.objects.all()
    serializer_class = MarcasSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre']
    ordering = ['nombre']


class CategoriasViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Categorías"""
    queryset = Categorias.objects.all()
    serializer_class = CategoriasSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']


class ModelosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Modelos"""
    queryset = Modelos.objects.select_related('marca').all()
    serializer_class = ModelosSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['marca']
    search_fields = ['nombre', 'marca__nombre']
    ordering_fields = ['nombre', 'marca__nombre']
    ordering = ['marca__nombre', 'nombre']


class EstadosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Estados"""
    queryset = Estados.objects.all()
    serializer_class = EstadosSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nombre', 'descripcion']
    ordering = ['nombre']



# ============= VIEWSET DE PRODUCTOS =============

class ProductosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Productos"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categoria', 'estado', 'proveedor', 'modelo']
    search_fields = ['nro_serie', 'modelo__nombre', 'categoria__nombre']
    ordering_fields = ['fecha_compra', 'nro_serie']
    ordering = ['-fecha_compra']
    
    def get_queryset(self):
        """
        OPTIMIZACIÓN CON SELECT_RELATED:
        
        En lugar de hacer una consulta por cada relación (proveedor, modelo, etc.),
        select_related hace un JOIN en SQL y trae todos los datos en una sola consulta.
        
        SIN select_related: 1 consulta + 1 consulta por cada producto para cada relación
        CON select_related: 1 sola consulta con JOIN
        """
        return Productos.objects.select_related(
            'proveedor', 'modelo', 'modelo__marca', 'categoria', 'estado'
        ).all()
    
    def get_serializer_class(self):
        """Usa serializer diferente según la acción"""
        if self.action == 'retrieve':
            return ProductosDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ProductosCreateUpdateSerializer
        return ProductosListSerializer
    
  
    @action(detail=False, methods=['get'])
    def disponibles(self, request):
        """Retorna productos disponibles (sin asignación activa)"""
        productos_asignados = Asignaciones.objects.filter(
            fecha_devolucion__isnull=True
        ).values_list('producto_id', flat=True)
        
        productos = self.get_queryset().exclude(id__in=productos_asignados)
        serializer = self.get_serializer(productos, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        """Agrupa productos por categoría"""
        from django.db.models import Count
        stats = Categorias.objects.annotate(
            total_productos=Count('productos')
        ).values('nombre', 'total_productos')
        return Response(stats)
    
    @action(detail=True, methods=['post'])
    def asignar(self, request, pk=None):
        """Asigna un producto a un usuario"""
        producto = self.get_object()
        usuario_id = request.data.get('usuario_id')
        
        # Verificar que no tenga asignación activa
        if Asignaciones.objects.filter(producto=producto, fecha_devolucion__isnull=True).exists():
            return Response(
                {'error': 'Este producto ya tiene una asignación activa'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear asignación
        asignacion = Asignaciones.objects.create(
            producto=producto,
            usuario_id=usuario_id
        )
        
        return Response(
            AsignacionesSerializer(asignacion).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'])
    def devolver(self, request, pk=None):
        """Marca como devuelto un producto asignado"""
        producto = self.get_object()
        
        try:
            asignacion = Asignaciones.objects.get(
                producto=producto,
                fecha_devolucion__isnull=True
            )
            asignacion.fecha_devolucion = date.today()
            asignacion.save()
            
            return Response(
                {'mensaje': 'Producto devuelto exitosamente'},
                status=status.HTTP_200_OK
            )
        except Asignaciones.DoesNotExist:
            return Response(
                {'error': 'Este producto no tiene una asignación activa'},
                status=status.HTTP_400_BAD_REQUEST
            )



# ============= VIEWSET DE USUARIOS =============

class UsuariosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Usuarios"""
    queryset = Usuarios.objects.select_related('user').all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['rol']
    search_fields = ['user__username', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['user__username', 'user__first_name']
    ordering = ['user__username']
    
    def get_serializer_class(self):
        """Usa serializer diferente para crear usuarios"""
        if self.action == 'create':
            return UsuariosCreateSerializer
        return UsuariosSerializer
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retorna información del usuario actual"""
        try:
            usuario = Usuarios.objects.get(user=request.user)
            serializer = self.get_serializer(usuario)
            return Response(serializer.data)
        except Usuarios.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['get'])
    def asignaciones_activas(self, request, pk=None):
        """Retorna las asignaciones activas de un usuario"""
        usuario = self.get_object()
        asignaciones = usuario.asignaciones.filter(fecha_devolucion__isnull=True)
        serializer = AsignacionesSerializer(asignaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def historial_asignaciones(self, request, pk=None):
        """Retorna el historial completo de asignaciones"""
        usuario = self.get_object()
        asignaciones = usuario.asignaciones.all()
        serializer = AsignacionesSerializer(asignaciones, many=True)
        return Response(serializer.data)
    


# ============= VIEWSET DE ASIGNACIONES =============

class AsignacionesViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Asignaciones"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['usuario', 'producto']
    ordering_fields = ['fecha_asignacion', 'fecha_devolucion']
    ordering = ['-fecha_asignacion']
    
    def get_queryset(self):
        """Optimiza las queries"""
        return Asignaciones.objects.select_related(
            'producto', 'producto__categoria', 'usuario', 'usuario__user'
        ).all()
    
    def get_serializer_class(self):
        """Usa serializer diferente para crear"""
        if self.action == 'create':
            return AsignacionesCreateSerializer
        return AsignacionesSerializer
    
    @action(detail=False, methods=['get'])
    def activas(self, request):
        """Retorna solo asignaciones activas"""
        asignaciones = self.get_queryset().filter(fecha_devolucion__isnull=True)
        serializer = self.get_serializer(asignaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def devueltas(self, request):
        """Retorna solo asignaciones devueltas"""
        asignaciones = self.get_queryset().filter(fecha_devolucion__isnull=False)
        serializer = self.get_serializer(asignaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_devuelta(self, request, pk=None):
        """Marca una asignación como devuelta"""
        asignacion = self.get_object()
        
        if asignacion.fecha_devolucion:
            return Response(
                {'error': 'Esta asignación ya fue marcada como devuelta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        asignacion.fecha_devolucion = date.today()
        asignacion.save()
        
        return Response(
            self.get_serializer(asignacion).data,
            status=status.HTTP_200_OK
        )



# ============= VIEWSET DE MANTENCIONES =============

class MantencionesViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Mantenciones"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['producto', 'proveedor']
    ordering_fields = ['fecha']
    ordering = ['-fecha']
    
    def get_queryset(self):
        return Mantenciones.objects.select_related(
            'producto', 'proveedor'
        ).all()
    
    serializer_class = MantencionesSerializer
    
    @action(detail=False, methods=['get'])
    def proximas(self, request):
        """Retorna mantenciones programadas (futuras)"""
        mantenciones = self.get_queryset().filter(fecha__gte=date.today())
        serializer = self.get_serializer(mantenciones, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def realizadas(self, request):
        """Retorna mantenciones ya realizadas"""
        mantenciones = self.get_queryset().filter(fecha__lt=date.today())
        serializer = self.get_serializer(mantenciones, many=True)
        return Response(serializer.data)



# ============= VIEWSET DE HISTORIAL DE ESTADOS =============

class HistorialEstadosViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Historial de Estados"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['producto', 'estado']
    ordering_fields = ['fecha']
    ordering = ['-fecha']
    
    def get_queryset(self):
        return HistorialEstados.objects.select_related(
            'producto', 'estado'
        ).all()
    
    def get_serializer_class(self):
        """Usa serializer especial para crear (actualiza producto automáticamente)"""
        if self.action == 'create':
            return HistorialEstadosCreateSerializer
        return HistorialEstadosSerializer



# ============= VIEWSET DE DOCUMENTACIÓN =============

class DocumentacionesViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Documentación"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['producto', 'tipo_documento']
    search_fields = ['nombre_archivo', 'tipo_documento']
    ordering_fields = ['fecha_subida']
    ordering = ['-fecha_subida']
    
    def get_queryset(self):
        return Documentaciones.objects.select_related('producto').all()
    
    serializer_class = DocumentacionesSerializer



# ============= VIEWSET DE NOTIFICACIONES =============

class NotificacionesViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar Notificaciones"""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['producto', 'leido']
    ordering_fields = ['fecha', 'hora']
    ordering = ['-fecha', '-hora']
    
    def get_queryset(self):
        return Notificaciones.objects.select_related('producto').all()
    
    serializer_class = NotificacionesSerializer
    
    @action(detail=False, methods=['get'])
    def no_leidas(self, request):
        """Retorna notificaciones no leídas"""
        notificaciones = self.get_queryset().filter(leido=False)
        serializer = self.get_serializer(notificaciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        """Marca una notificación como leída"""
        notificacion = self.get_object()
        notificacion.leido = True
        notificacion.save()
        return Response(
            self.get_serializer(notificacion).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=False, methods=['post'])
    def marcar_todas_leidas(self, request):
        """Marca todas las notificaciones como leídas"""
        self.get_queryset().filter(leido=False).update(leido=True)
        return Response(
            {'mensaje': 'Todas las notificaciones fueron marcadas como leídas'},
            status=status.HTTP_200_OK
        )



# ============= VIEWSET DE LOG DE ACCESOS =============

class LogAccesoViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar Logs de Acceso (solo lectura)"""
    queryset = LogAcceso.objects.select_related('usuario', 'usuario__user').all()
    serializer_class = LogAccesoSerializer
    permission_classes = [IsAdminUser]  # Solo admin puede ver logs
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['usuario']
    ordering_fields = ['fecha_hora']
    ordering = ['-fecha_hora']
    
    @action(detail=False, methods=['get'])
    def ultimos_accesos(self, request):
        """Retorna los últimos 50 accesos"""
        logs = self.get_queryset()[:50]
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)
    

"""

    VISTA DE LISTADO - Muestra múltiples registros en tabla
    
    ¿QUÉ HACE?
    - Muestra todos los productos en una tabla HTML
    - Aplica filtros de búsqueda, categoría, estado
    - Ordena resultados (más recientes primero)
    
    FLUJO:
    1. Obtiene productos de la BD (optimizado con select_related)
    2. Aplica filtros desde formulario GET
    3. Prepara datos para el template
    4. Renderiza tabla HTML con resultados
    
    URL: /productos/

"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib import messages
from django.db.models import Q
from django.http import JsonResponse
from .models import Productos, Categorias, Estados, Marcas, Modelos
from .forms import (
    ProductoForm, ProductoFilterForm,
    ProveedorForm, ProveedorFilterForm,
    CategoriasForm, CategoriasFilterForm,
    EstadosForm, EstadosFilterForm,
    MarcasForm, MarcasFilterForm,
    ModelosForm, ModelosFilterForm
    
    )


# ============= VISTAS DE PROVEEDORES =============

def proveedores_list(request):
    """Lista de proveedores con filtros"""
    
    proveedores = Proveedores.objects.all()
    
    # Aplicar filtros
    filter_form = ProveedorFilterForm(request.GET)
    
    if filter_form.is_valid():
        search = filter_form.cleaned_data.get('search')
        if search:
            proveedores = proveedores.filter(
                Q(nombre__icontains=search) |
                Q(rut__icontains=search) |
                Q(contacto__icontains=search)
            )
    
    # Ordenar por nombre
    proveedores = proveedores.order_by('nombre')
    
    context = {
        'proveedores': proveedores,
        'filter_form': filter_form,
        'total_proveedores': proveedores.count(),
    }
    
    return render(request, 'listar_proveedores.html', context)


def proveedores_create(request):
    """Crear nuevo proveedor"""
    
    if request.method == 'POST':
        form = ProveedorForm(request.POST)
        
        if form.is_valid():
            proveedor = form.save()
            messages.success(request, f'Proveedor {proveedor.nombre} creado exitosamente.')
            return redirect('proveedores')
        else:
            messages.error(request, 'Error al crear el proveedor. Verifica los datos.')
    else:
        form = ProveedorForm()
    
    context = {
        'form': form,
        'title': 'Agregar Proveedor',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_proveedor.html', context)


def proveedores_edit(request, pk):
    """Editar proveedor existente"""
    
    proveedor = get_object_or_404(Proveedores, pk=pk)
    
    if request.method == 'POST':
        form = ProveedorForm(request.POST, instance=proveedor)
        
        if form.is_valid():
            form.save()
            messages.success(request, f'Proveedor {proveedor.nombre} actualizado exitosamente.')
            return redirect('proveedores')
        else:
            messages.error(request, 'Error al actualizar el proveedor.')
    else:
        form = ProveedorForm(instance=proveedor)
    
    context = {
        'form': form,
        'proveedor': proveedor,
        'title': f'Editar Proveedor {proveedor.nombre}',
        'action': 'Actualizar',
    }
    
    return render(request, 'actualizar_proveedor.html', context)


def proveedores_delete(request, pk):
    """Eliminar proveedor"""
    
    proveedor = get_object_or_404(Proveedores, pk=pk)
    
    if request.method == 'POST':
        nombre = proveedor.nombre
        proveedor.delete()
        messages.success(request, f'Proveedor {nombre} eliminado exitosamente.')
        return redirect('proveedores')
    
    context = {
        'proveedor': proveedor,
    }
    
    return render(request, 'eliminar_proveedor.html', context)


# ============= VISTAS DE CATEGORÍAS =============

def categorias_list(request):
    """Lista de categorías con filtros"""
    
    categorias = Categorias.objects.all()
    
    # Aplicar filtros
    filter_form = CategoriasFilterForm(request.GET)
    
    if filter_form.is_valid():
        search = filter_form.cleaned_data.get('search')
        if search:
            categorias = categorias.filter(
                Q(nombre__icontains=search) |
                Q(descripcion__icontains=search)
            )
    
    # Ordenar por nombre
    categorias = categorias.order_by('nombre')
    
    context = {
        'categorias': categorias,
        'filter_form': filter_form,
        'total_categorias': categorias.count(),
    }
    
    return render(request, 'listar_categorias.html', context)


def categorias_create(request):
    """Crear nueva categoría"""
    
    if request.method == 'POST':
        form = CategoriasForm(request.POST)
        
        if form.is_valid():
            categoria = form.save()
            messages.success(request, f'Categoría {categoria.nombre} creada exitosamente.')
            return redirect('categorias')
        else:
            messages.error(request, 'Error al crear la categoría. Verifica los datos.')
    else:
        form = CategoriasForm()
    
    context = {
        'form': form,
        'title': 'Agregar Categoría',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_categoria.html', context)


def categorias_edit(request, pk):
    """Editar categoría existente"""
    
    categoria = get_object_or_404(Categorias, pk=pk)
    
    if request.method == 'POST':
        form = CategoriasForm(request.POST, instance=categoria)
        
        if form.is_valid():
            form.save()
            messages.success(request, f'Categoría {categoria.nombre} actualizada exitosamente.')
            return redirect('categorias')
        else:
            messages.error(request, 'Error al actualizar la categoría.')
    else:
        form = CategoriasForm(instance=categoria)
    
    context = {
        'form': form,
        'categoria': categoria,
        'title': f'Editar Categoría {categoria.nombre}',
        'action': 'Actualizar',
    }
    
    return render(request, 'actualizar_categoria.html', context)


def categorias_delete(request, pk):
    """Eliminar categoría"""
    
    categoria = get_object_or_404(Categorias, pk=pk)
    
    if request.method == 'POST':
        nombre = categoria.nombre
        categoria.delete()
        messages.success(request, f'Categoría {nombre} eliminada exitosamente.')
        return redirect('categorias')
    
    context = {
        'categoria': categoria,
    }
    
    return render(request, 'eliminar_categoria.html', context)


# ============= VISTAS DE MARCAS =============

def marcas_list(request):
    """Lista de marcas con filtros"""
    
    marcas = Marcas.objects.all()
    
    # Aplicar filtros
    filter_form = MarcasFilterForm(request.GET)
    
    if filter_form.is_valid():
        search = filter_form.cleaned_data.get('search')
        if search:
            marcas = marcas.filter(nombre__icontains=search)
    
    # Ordenar por nombre
    marcas = marcas.order_by('nombre')
    
    context = {
        'marcas': marcas,
        'filter_form': filter_form,
        'total_marcas': marcas.count(),
    }
    
    return render(request, 'listar_marcas.html', context)


def marcas_create(request):
    """Crear nueva marca"""
    
    if request.method == 'POST':
        form = MarcasForm(request.POST)
        
        if form.is_valid():
            marca = form.save()
            messages.success(request, f'Marca {marca.nombre} creada exitosamente.')
            return redirect('marcas')
        else:
            messages.error(request, 'Error al crear la marca. Verifica los datos.')
    else:
        form = MarcasForm()
    
    context = {
        'form': form,
        'title': 'Agregar Marca',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_marca.html', context)


def marcas_edit(request, pk):
    """Editar marca existente"""
    
    marca = get_object_or_404(Marcas, pk=pk)
    
    if request.method == 'POST':
        form = MarcasForm(request.POST, instance=marca)
        
        if form.is_valid():
            form.save()
            messages.success(request, f'Marca {marca.nombre} actualizada exitosamente.')
            return redirect('marcas')
        else:
            messages.error(request, 'Error al actualizar la marca.')
    else:
        form = MarcasForm(instance=marca)
    
    context = {
        'form': form,
        'marca': marca,
        'title': f'Editar Marca {marca.nombre}',
        'action': 'Actualizar',
    }
    
    return render(request, 'actualizar_marca.html', context)


def marcas_delete(request, pk):
    """Eliminar marca"""
    
    marca = get_object_or_404(Marcas, pk=pk)
    
    if request.method == 'POST':
        nombre = marca.nombre
        marca.delete()
        messages.success(request, f'Marca {nombre} eliminada exitosamente.')
        return redirect('marcas')
    
    context = {
        'marca': marca,
    }
    
    return render(request, 'eliminar_marca.html', context)


# ============= VISTAS DE MODELOS =============

def modelos_list(request):
    """Lista de modelos con filtros"""
    
    modelos = Modelos.objects.select_related('marca').all()
    
    # Aplicar filtros
    filter_form = ModelosFilterForm(request.GET)
    
    if filter_form.is_valid():
        search = filter_form.cleaned_data.get('search')
        if search:
            modelos = modelos.filter(
                Q(nombre__icontains=search) |
                Q(marca__nombre__icontains=search)
            )
        
        marca = filter_form.cleaned_data.get('marca')
        if marca:
            modelos = modelos.filter(marca=marca)
    
    # Ordenar por marca y nombre
    modelos = modelos.order_by('marca__nombre', 'nombre')
    
    context = {
        'modelos': modelos,
        'filter_form': filter_form,
        'total_modelos': modelos.count(),
    }
    
    return render(request, 'listar_modelos.html', context)


def modelos_create(request):
    """Crear nuevo modelo"""
    
    if request.method == 'POST':
        form = ModelosForm(request.POST)
        
        if form.is_valid():
            modelo = form.save()
            messages.success(request, f'Modelo {modelo.nombre} creado exitosamente.')
            return redirect('modelos')
        else:
            messages.error(request, 'Error al crear el modelo. Verifica los datos.')
    else:
        form = ModelosForm()
    
    context = {
        'form': form,
        'title': 'Agregar Modelo',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_modelo.html', context)


def modelos_edit(request, pk):
    """Editar modelo existente"""
    
    modelo = get_object_or_404(Modelos, pk=pk)
    
    if request.method == 'POST':
        form = ModelosForm(request.POST, instance=modelo)
        
        if form.is_valid():
            form.save()
            messages.success(request, f'Modelo {modelo.nombre} actualizado exitosamente.')
            return redirect('modelos')
        else:
            messages.error(request, 'Error al actualizar el modelo.')
    else:
        form = ModelosForm(instance=modelo)
    
    context = {
        'form': form,
        'modelo': modelo,
        'title': f'Editar Modelo {modelo.nombre}',
        'action': 'Actualizar',
    }
    
    return render(request, 'actualizar_modelo.html', context)


def modelos_delete(request, pk):
    """Eliminar modelo"""
    
    modelo = get_object_or_404(Modelos, pk=pk)
    
    if request.method == 'POST':
        nombre = modelo.nombre
        modelo.delete()
        messages.success(request, f'Modelo {nombre} eliminado exitosamente.')
        return redirect('modelos')
    
    context = {
        'modelo': modelo,
    }
    
    return render(request, 'eliminar_modelo.html', context)


# ============= VISTAS DE ESTADOS =============

def estados_list(request):
    """Lista de estados con filtros"""
    
    estados = Estados.objects.all()
    
# Aplicar filtros
    filter_form = EstadosFilterForm(request.GET)
    
    if filter_form.is_valid():
        search = filter_form.cleaned_data.get('search')
        if search:
            estados = estados.filter(
                Q(nombre__icontains=search) |
                Q(descripcion__icontains=search)
            )

    # Ordenar por nombre
    estados = estados.order_by('nombre')
    
    context = {
        'estados': estados,
        'filter_form': filter_form,
        'total_estados': estados.count(),
    }
    
    return render(request, 'listar_estados.html', context)


def estados_create(request):
    """Crear nuevo estado"""
    
    if request.method == 'POST':
        form = EstadosForm(request.POST)
        
        if form.is_valid():
            estado = form.save()
            messages.success(request, f'Estado {estado.nombre} creado exitosamente.')
            return redirect('estados')
        else:
            messages.error(request, 'Error al crear el estado. Verifica los datos.')
    else:
        form = EstadosForm()
    
    context = {
        'form': form,
        'title': 'Agregar Estado',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_estado.html', context)


def estados_edit(request, pk):
    """Editar estado existente"""
    
    estado = get_object_or_404(Estados, pk=pk)
    
    if request.method == 'POST':
        form = EstadosForm(request.POST, instance=estado)
        
        if form.is_valid():
            form.save()
            messages.success(request, f'Estado {estado.nombre} actualizado exitosamente.')
            return redirect('estados')
        else:
            messages.error(request, 'Error al actualizar el estado.')
    else:
        form = EstadosForm(instance=estado)
    
    context = {
        'form': form,
        'estado': estado,
        'title': f'Editar Estado {estado.nombre}',
        'action': 'Actualizar',
    }
    
    return render(request, 'actualizar_estado.html', context)


def estados_delete(request, pk):
    """Eliminar estado"""
    
    estado = get_object_or_404(Estados, pk=pk)
    
    if request.method == 'POST':
        nombre = estado.nombre
        estado.delete()
        messages.success(request, f'Estado {nombre} eliminado exitosamente.')
        return redirect('estados')
    
    context = {
        'estado': estado,
    }
    
    return render(request, 'eliminar_estado.html', context)




# ============= VISTA PRINCIPAL DE PRODUCTOS =============

def productos_list(request):
    """Lista de productos con filtros"""
    
    # Obtener todos los productos con relaciones
    productos = Productos.objects.select_related(
        'categoria', 'modelo', 'modelo__marca', 'estado', 'proveedor'
    ).all()
    
    # Aplicar filtros
    filter_form = ProductoFilterForm(request.GET)
    
    if filter_form.is_valid():
        # Filtro de búsqueda por texto
        search = filter_form.cleaned_data.get('search')
        if search:
            productos = productos.filter(
                Q(nro_serie__icontains=search) |
                Q(modelo__nombre__icontains=search) |
                Q(categoria__nombre__icontains=search)
            )
        
        # Filtro por categoría
        categoria = filter_form.cleaned_data.get('categoria')
        if categoria:
            productos = productos.filter(categoria=categoria)
        
        # Filtro por estado
        estado = filter_form.cleaned_data.get('estado')
        if estado:
            productos = productos.filter(estado=estado)
        
        # Filtro por proveedor
        proveedor = filter_form.cleaned_data.get('proveedor')
        if proveedor:
            productos = productos.filter(proveedor=proveedor)

        # Filtro por disponibilidad
        solo_disponibles = filter_form.cleaned_data.get('solo_disponibles')
        if solo_disponibles:
            from .models import Asignaciones
            productos_asignados_ids = Asignaciones.objects.filter(
                fecha_devolucion__isnull=True
            ).values_list('producto_id', flat=True)
            productos = productos.exclude(id__in=productos_asignados_ids)
    
    # Ordenar por fecha de compra (más recientes primero)
    productos = productos.order_by('-fecha_compra')
    
    context = {
        'productos': productos,
        'filter_form': filter_form,
        'total_productos': productos.count(),
    }
    
    return render(request, 'listar_productos.html', context)


# ============= CREAR PRODUCTO =============

def productos_create(request):

    """Crear nuevo producto"""
    marcas = Marcas.objects.all()

    if request.method == 'POST':
        form = ProductoForm(request.POST)
        
        if form.is_valid():
            producto = form.save()
            messages.success(request, f'Producto {producto.nro_serie} creado exitosamente.')
            return redirect('productos')
        else:
            messages.error(request, 'Error al crear el producto. Verifica los datos.')
    else:
        form = ProductoForm()
    
    context = {
        'form': form,
        'marcas': marcas,  # ← Pasamos marcas manualmente
        'title': 'Agregar Producto',
        'action': 'Crear',
    }
    
    return render(request, 'agregar_productos.html', context)


# ============= EDITAR PRODUCTO =============

def productos_edit(request, pk):
    producto = get_object_or_404(Productos, pk=pk)
    
    if request.method == 'POST':
        # Crear una copia mutable de request.POST
        post_data = request.POST.copy()
        
        # Forzar los valores de los campos bloqueados
        post_data['nro_serie'] = producto.nro_serie
        post_data['categoria'] = producto.categoria.id
        post_data['modelo'] = producto.modelo.id
        
        form = ProductoForm(post_data, instance=producto)
        
        if form.is_valid():
            # Guardar normalmente - los campos ya están forzados
            form.save()
            messages.success(request, f'Producto {producto.nro_serie} actualizado exitosamente.')
            return redirect('productos')
        else:
            # Mostrar errores detallados para debug
            print("Errores del formulario:", form.errors)
            messages.error(request, f'Error al actualizar el producto: {form.errors}')
    else:
        form = ProductoForm(instance=producto)
    
    context = {
        'form': form,
        'producto': producto,
        'title': f'Editar Producto {producto.nro_serie}',
    }
    
    return render(request, 'actualizar_productos.html', context)
    

# ============= ELIMINAR PRODUCTO =============

def productos_delete(request, pk):
    """Eliminar producto"""
    
    producto = get_object_or_404(Productos, pk=pk)
    
    if request.method == 'POST':
        nro_serie = producto.nro_serie
        producto.delete()
        messages.success(request, f'Producto {nro_serie} eliminado exitosamente.')
        return redirect('productos')
    
    context = {
        'producto': producto,
    }
    
    return render(request, 'eliminar_productos.html', context)


# ============= DETALLE DE PRODUCTO =============

def producto_detail(request, pk):
    """Ver detalle completo de un producto"""
    
    producto = get_object_or_404(
        Productos.objects.select_related(
            'categoria', 'modelo', 'modelo__marca', 'estado', 'proveedor'
        ).prefetch_related(
            'asignaciones', 'mantenciones', 'historial_estados'
        ),
        pk=pk
    )
    
    context = {
        'producto': producto,
    }
    
    return render(request, 'producto_detail.html', context)


# ============= AJAX: CARGAR MODELOS POR MARCA =============
"""
    ENDPOINT AJAX - Carga modelos dependiendo de la marca seleccionada
    
    ¿CÓMO FUNCIONA EL FLUJO AJAX?
    1. Usuario selecciona una marca en el formulario HTML
    2. JavaScript detecta el cambio y llama a esta URL
    3. Esta función consulta los modelos de esa marca
    4. Devuelve los datos en formato JSON
    5. JavaScript recibe los datos y actualiza el select de modelos
    
    EJEMPLO DE LLAMADA:
    GET /get-modelos-by-marca/?marca_id=1
    
    RESPUESTA:
    [{"id": 1, "nombre": "Modelo A"}, {"id": 2, "nombre": "Modelo B"}]
    """
def get_modelos_by_marca(request):
    """API endpoint para obtener modelos de una marca (AJAX)"""
    
    marca_id = request.GET.get('marca_id')
    
    if marca_id:
        modelos = Modelos.objects.filter(marca_id=marca_id).values('id', 'nombre')
        return JsonResponse(list(modelos), safe=False)
    
    return JsonResponse([], safe=False)


# ============= FILTROS RÁPIDOS =============

def productos_disponibles(request):
    """Productos sin asignación activa"""
    
    from .models import Asignaciones
    
    productos_asignados_ids = Asignaciones.objects.filter(
        fecha_devolucion__isnull=True
    ).values_list('producto_id', flat=True)
    
    productos = Productos.objects.select_related(
        'categoria', 'modelo', 'estado', 'proveedor'
    ).exclude(id__in=productos_asignados_ids)
    
    filter_form = ProductoFilterForm()
    
    context = {
        'productos': productos,
        'filter_form': filter_form,
        'total_productos': productos.count(),
        'filtro_activo': 'disponibles',
    }
    
    return render(request, 'listar_productos.html', context)


# ============= VISTA ÍNDICE =============

def index(request):
    """Página principal / Dashboard"""
    
    from .models import Asignaciones
    
    # Estadísticas
    total_productos = Productos.objects.count()
    productos_operativos = Productos.objects.filter(estado__nombre='Operativo').count()
    productos_mantencion = Productos.objects.filter(estado__nombre='En Mantención').count()
    
    productos_asignados = Asignaciones.objects.filter(
        fecha_devolucion__isnull=True
    ).count()
    
    context = {
        'total_productos': total_productos,
        'productos_operativos': productos_operativos,
        'productos_mantencion': productos_mantencion,
        'productos_asignados': productos_asignados,
    }
    
    return render(request, 'index.html', context)