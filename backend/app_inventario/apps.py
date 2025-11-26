from django.apps import AppConfig


from django.apps import AppConfig

class AppConfig(AppConfig):  
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app_inventario' 
    verbose_name = 'Inventario'  # ← Opcional
    def ready(self):
        import app_inventario.signals
