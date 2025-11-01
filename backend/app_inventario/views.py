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
        """Optimiza las queries con select_related"""
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