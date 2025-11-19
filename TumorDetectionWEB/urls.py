"""
URL configuration for TumorDetectionWEB project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.http import HttpResponse # <--- Agrega esto arriba
from django.urls import path, include

# Crea una vista simple
def home(request):
    return HttpResponse("<h1>🚀 API de Detección de Tumores Activa</h1><p>Usa el frontend local para interactuar.</p>")

urlpatterns = [
    path('', home), # <--- Agrega esta ruta para la raíz
    path('api/', include('api.urls')),
]
