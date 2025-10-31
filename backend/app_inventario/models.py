from django.db import models
from django.contrib.auth.models import User

class Proveedores(models.Model):
    """Proveedores de productos tecnológicos"""
    nombre = models.CharField(max_length=200)
    rut = models.CharField(max_length=12, unique=True)
    contacto = models.CharField(max_length=200)
    telefono = models.CharField(max_length=20)
    correo = models.EmailField()

    class Meta:
        verbose_name_plural = "Proveedores"

    def __str__(self):
        return f"{self.nombre} ({self.rut})"


class Marcas(models.Model):
    """Marcas de productos (HP, Dell, Lenovo, etc.)"""
    nombre = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = "Marcas"

    def __str__(self):
        return self.nombre


class Categorias(models.Model):
    """Categorías de productos (Computadores, Impresoras, Tablets, etc.)"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categorías"

    def __str__(self):
        return self.nombre


class Modelos(models.Model):
    """Modelos específicos de productos"""
    marca = models.ForeignKey(Marcas, on_delete=models.CASCADE, related_name='modelos')
    nombre = models.CharField(max_length=200)

    class Meta:
        verbose_name_plural = "Modelos"
        unique_together = ['marca', 'nombre']

    def __str__(self):
        return f"{self.marca.nombre} {self.nombre}"


class Estados(models.Model):
    """Estados posibles de los productos (Operativo, En Mantención, Dado de Baja, etc.)"""
    nombre = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Estados"

    def __str__(self):
        return self.nombre


class Productos(models.Model):
    """Productos/Activos tecnológicos"""

    nro_serie = models.CharField(max_length=100, unique=True, verbose_name="Número de Serie")
    fecha_compra = models.DateField()
    estado = models.ForeignKey(Estados, on_delete=models.PROTECT, related_name='productos')
    documento_factura = models.CharField(max_length=200, blank=True, null=True)
    
    # Relaciones
    proveedor = models.ForeignKey(Proveedores, on_delete=models.PROTECT, related_name='productos')
    sucursal = models.ForeignKey('Sucursal', on_delete=models.PROTECT, related_name='productos', blank=True, null=True)
    modelo = models.ForeignKey(Modelos, on_delete=models.PROTECT, related_name='productos')
    categoria = models.ForeignKey(Categorias, on_delete=models.PROTECT, related_name='productos')

    class Meta:
        verbose_name_plural = "Productos"

    def __str__(self):
        return f"{self.categoria} - {self.nro_serie} ({self.modelo})"


class Usuario(models.Model):
    """Usuarios del sistema (empleados que usan los productos)"""
    ROLES = [
        ('ADMIN', 'Administrador'),
        ('USUARIO', 'Usuario'),
    ]

    #Llamamos al user default de django que contiene:
        # Campos principales:
        #user.username          # Nombre de usuario (único, requerido)
        #user.password          # Contraseña hasheada (nunca en texto plano)
        #user.email             # Email
        #user.first_name        # Nombre
        #user.last_name         # Apellido

        # Campos de estado:
        #user.is_active         # Usuario activo (True/False)
        #user.is_staff          # Puede acceder al admin (True/False)
        #user.is_superuser      # Superusuario con todos los permisos

        # Fechas:
        #user.date_joined       # Fecha de registro
        #user.last_login        # Último login

        # Métodos útiles:
        #user.get_full_name()   # Retorna "Nombre Apellido"
        #user.set_password('nueva_pass')  # Hashea y guarda contraseña
        #user.check_password('pass')      # Verifica si la contraseña es correcta

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil_usuario')
    rol = models.CharField(max_length=20, choices=ROLES, default='USUARIO')
    

    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.user.username})"

class Asignaciones(models.Model):
    """Asignación de productos a usuarios"""
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE, related_name='asignaciones')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='asignaciones')
    fecha_asignacion = models.DateField(auto_now_add=True)
    fecha_devolucion = models.DateField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Asignaciones"

    def __str__(self):
        estado = "Activa" if not self.fecha_devolucion else "Devuelta"
        return f"{self.producto.nro_serie} → {self.usuario} ({estado})"


class Mantenciones(models.Model):
    """Mantenciones realizadas a los productos"""
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE, related_name='mantenciones')
    fecha = models.DateField()
    detalle = models.TextField()
    proveedor = models.ForeignKey(Proveedores, on_delete=models.SET_NULL, null=True, blank=True, related_name='mantenciones')

    class Meta:
        verbose_name_plural = "Mantenciones"
        ordering = ['-fecha']

    def __str__(self):
        return f"Mantención {self.producto.nro_serie} - {self.fecha}"


class HistorialEstados(models.Model):
    """Historial de cambios de estado de los productos"""
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE, related_name='historial_estados')
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.ForeignKey(Estados, on_delete=models.PROTECT, related_name='historiales')
    comentario = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Historial de Estados"
        ordering = ['-fecha']

    def __str__(self):
        return f"{self.producto.nro_serie} → {self.estado.nombre} ({self.fecha.strftime('%d/%m/%Y %H:%M')})"


class Documentaciones(models.Model):
    """Documentación asociada a productos"""
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE, related_name='documentos')
    tipo_documento = models.CharField(max_length=100)
    nombre_archivo = models.CharField(max_length=255)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Documentación"

    def __str__(self):
        return f"{self.tipo_documento} - {self.nombre_archivo}"


class Notificacion(models.Model):
    """Notificaciones del sistema"""
    producto = models.ForeignKey(Productos, on_delete=models.CASCADE, related_name='notificaciones')
    mensaje = models.TextField()
    fecha = models.DateField(auto_now_add=True)
    hora = models.TimeField(auto_now_add=True)
    leido = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "Notificaciones"
        ordering = ['-fecha', '-hora']

    def __str__(self):
        return f"Notificación: {self.mensaje[:50]}..."


class LogAcceso(models.Model):
    """Log de accesos al sistema"""
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='logs_acceso')
    fecha_hora = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Logs de Acceso"
        ordering = ['-fecha_hora']

    def __str__(self):
        return f"{self.usuario.usuario_login} - {self.fecha_hora.strftime('%d/%m/%Y %H:%M:%S')}"