from rest_framework import serializers
from .models import Proveedores, Marcas, Categorias, Modelos, Estados, Productos, Usuarios, Asignaciones, Mantenciones, HistorialEstados, Documentaciones, Notificaciones, LogAcceso


from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Proveedores, Marcas, Categorias, Modelos, Estados, Productos,
    Usuarios, Asignaciones, Mantenciones, HistorialEstados,
    Documentaciones, Notificaciones, LogAcceso
)


# ============= SERIALIZERS BÁSICOS =============

class UserSerializer(serializers.ModelSerializer):
    """Serializer para el User de Django"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active']
        read_only_fields = ['id']


class ProveedoresSerializer(serializers.ModelSerializer):
    """Serializer para Proveedores"""
    class Meta:
        model = Proveedores
        fields = '__all__'


class MarcasSerializer(serializers.ModelSerializer):
    """Serializer para Marcas"""
    class Meta:
        model = Marcas
        fields = '__all__'


class CategoriasSerializer(serializers.ModelSerializer):
    """Serializer para Categorías"""
    class Meta:
        model = Categorias
        fields = '__all__'


class ModelosSerializer(serializers.ModelSerializer):
    """Serializer básico para Modelos"""
    marca_nombre = serializers.CharField(source='marca.nombre', read_only=True)
    
    class Meta:
        model = Modelos
        fields = ['id', 'marca', 'marca_nombre', 'nombre']


class EstadosSerializer(serializers.ModelSerializer):
    """Serializer para Estados"""
    class Meta:
        model = Estados
        fields = '__all__'


# ============= SERIALIZERS DE USUARIOS =============

class UsuariosSerializer(serializers.ModelSerializer):
    """Serializer para Usuarios"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    nombre_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Usuarios
        fields = ['id', 'user', 'username', 'email', 'nombre_completo', 'rol']
        read_only_fields = ['id']
    
    def get_nombre_completo(self, obj):
        return obj.user.get_full_name()


class UsuariosCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear usuarios (incluye creación del User)"""
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    email = serializers.EmailField(write_only=True)
    first_name = serializers.CharField(write_only=True)
    last_name = serializers.CharField(write_only=True)
    
    class Meta:
        model = Usuarios
        fields = ['id', 'username', 'password', 'email', 'first_name', 'last_name', 'rol']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        # Extraer datos del User
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        email = validated_data.pop('email')
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        
        # Crear User de Django
        user = User.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        
        # Crear Usuario personalizado
        usuario = Usuarios.objects.create(user=user, **validated_data)
        return usuario


# ============= SERIALIZERS DE PRODUCTOS =============

class ProductosListSerializer(serializers.ModelSerializer):
    """Serializer para listar productos (información resumida)"""
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    modelo_nombre = serializers.SerializerMethodField()
    categoria_nombre = serializers.CharField(source='categoria.nombre', read_only=True)
    estado_nombre = serializers.CharField(source='estado.nombre', read_only=True)
    
    class Meta:
        model = Productos
        fields = [
            'id', 'nro_serie', 'fecha_compra', 
            'proveedor', 'proveedor_nombre',
            'modelo', 'modelo_nombre',
            'categoria', 'categoria_nombre',
            'estado', 'estado_nombre',
            'documento_factura'
        ]
    
    def get_modelo_nombre(self, obj):
        return f"{obj.modelo.marca.nombre} {obj.modelo.nombre}"


class ProductosDetailSerializer(serializers.ModelSerializer):
    """Serializer detallado para productos (incluye relaciones)"""
    proveedor = ProveedoresSerializer(read_only=True)
    modelo = ModelosSerializer(read_only=True)
    categoria = CategoriasSerializer(read_only=True)
    estado = EstadosSerializer(read_only=True)
    
    # Relaciones inversas
    asignaciones = serializers.SerializerMethodField()
    mantenciones = serializers.SerializerMethodField()
    historial_estados = serializers.SerializerMethodField()
    
    class Meta:
        model = Productos
        fields = [
            'id', 'nro_serie', 'fecha_compra', 'documento_factura',
            'proveedor', 'modelo', 'categoria', 'estado',
            'asignaciones', 'mantenciones', 'historial_estados'
        ]
    
    def get_asignaciones(self, obj):
        asignaciones = obj.asignaciones.filter(fecha_devolucion__isnull=True)
        return AsignacionesSerializer(asignaciones, many=True).data
    
    def get_mantenciones(self, obj):
        mantenciones = obj.mantenciones.all()[:5]  # Últimas 5
        return MantencionesSerializer(mantenciones, many=True).data
    
    def get_historial_estados(self, obj):
        historial = obj.historial_estados.all()[:10]  # Últimos 10
        return HistorialEstadosSerializer(historial, many=True).data


class ProductosCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer para crear/actualizar productos"""
    class Meta:
        model = Productos
        fields = '__all__'


# ============= SERIALIZERS DE ASIGNACIONES =============

class AsignacionesSerializer(serializers.ModelSerializer):
    """Serializer para Asignaciones"""
    producto_info = serializers.SerializerMethodField()
    usuario_nombre = serializers.SerializerMethodField()
    estado_asignacion = serializers.SerializerMethodField()
    
    class Meta:
        model = Asignaciones
        fields = [
            'id', 'producto', 'producto_info', 
            'usuario', 'usuario_nombre',
            'fecha_asignacion', 'fecha_devolucion',
            'estado_asignacion'
        ]
    
    def get_producto_info(self, obj):
        return f"{obj.producto.categoria.nombre} - {obj.producto.nro_serie}"
    
    def get_usuario_nombre(self, obj):
        return obj.usuario.user.get_full_name()
    
    def get_estado_asignacion(self, obj):
        return "Activa" if not obj.fecha_devolucion else "Devuelta"


class AsignacionesCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear asignaciones"""
    class Meta:
        model = Asignaciones
        fields = ['producto', 'usuario', 'fecha_devolucion']
    
    def validate_producto(self, value):
        """Validar que el producto no tenga asignación activa"""
        asignacion_activa = Asignaciones.objects.filter(
            producto=value,
            fecha_devolucion__isnull=True
        ).exists()
        
        if asignacion_activa:
            raise serializers.ValidationError(
                "Este producto ya tiene una asignación activa."
            )
        return value


# ============= SERIALIZERS DE MANTENCIONES =============

class MantencionesSerializer(serializers.ModelSerializer):
    """Serializer para Mantenciones"""
    producto_nro_serie = serializers.CharField(source='producto.nro_serie', read_only=True)
    proveedor_nombre = serializers.CharField(source='proveedor.nombre', read_only=True)
    
    class Meta:
        model = Mantenciones
        fields = [
            'id', 'producto', 'producto_nro_serie',
            'fecha', 'detalle',
            'proveedor', 'proveedor_nombre'
        ]


# ============= SERIALIZERS DE HISTORIAL =============

class HistorialEstadosSerializer(serializers.ModelSerializer):
    """Serializer para Historial de Estados"""
    producto_nro_serie = serializers.CharField(source='producto.nro_serie', read_only=True)
    estado_nombre = serializers.CharField(source='estado.nombre', read_only=True)
    
    class Meta:
        model = HistorialEstados
        fields = [
            'id', 'producto', 'producto_nro_serie',
            'fecha', 'estado', 'estado_nombre', 'comentario'
        ]


class HistorialEstadosCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear historial (actualiza estado del producto automáticamente)"""
    class Meta:
        model = HistorialEstados
        fields = ['producto', 'estado', 'comentario']
    
    def create(self, validated_data):
        # Crear el registro de historial
        historial = super().create(validated_data)
        
        # Actualizar el estado actual del producto
        producto = validated_data['producto']
        producto.estado = validated_data['estado']
        producto.save()
        
        return historial


# ============= SERIALIZERS DE DOCUMENTACIÓN =============

class DocumentacionesSerializer(serializers.ModelSerializer):
    """Serializer para Documentación"""
    producto_nro_serie = serializers.CharField(source='producto.nro_serie', read_only=True)
    
    class Meta:
        model = Documentaciones
        fields = [
            'id', 'producto', 'producto_nro_serie',
            'tipo_documento', 'nombre_archivo', 'fecha_subida'
        ]
        read_only_fields = ['fecha_subida']


# ============= SERIALIZERS DE NOTIFICACIONES =============

class NotificacionesSerializer(serializers.ModelSerializer):
    """Serializer para Notificaciones"""
    producto_nro_serie = serializers.CharField(source='producto.nro_serie', read_only=True)
    
    class Meta:
        model = Notificaciones
        fields = [
            'id', 'producto', 'producto_nro_serie',
            'mensaje', 'fecha', 'hora', 'leido'
        ]
        read_only_fields = ['fecha', 'hora']


# ============= SERIALIZERS DE LOG ACCESO =============

class LogAccesoSerializer(serializers.ModelSerializer):
    """Serializer para Log de Accesos"""
    usuario_nombre = serializers.SerializerMethodField()
    username = serializers.CharField(source='usuario.user.username', read_only=True)
    
    class Meta:
        model = LogAcceso
        fields = ['id', 'usuario', 'usuario_nombre', 'username', 'fecha_hora']
        read_only_fields = ['fecha_hora']
    
    def get_usuario_nombre(self, obj):
        return obj.usuario.user.get_full_name()