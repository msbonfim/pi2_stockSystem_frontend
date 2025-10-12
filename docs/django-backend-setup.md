# Django Backend Setup para Sistema de Estoque

## 1. Criação do Projeto Django

```bash
# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install django djangorestframework django-cors-headers celery redis

# Criar projeto
django-admin startproject inventory_backend
cd inventory_backend
python manage.py startapp products
```

## 2. Configuração (settings.py)

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'products',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Configuração CORS para React
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Seu React app
    "http://127.0.0.1:3000",
]

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ]
}
```

## 3. Models (products/models.py)

```python
from django.db import models
from datetime import date, timedelta

class Product(models.Model):
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    quantity = models.PositiveIntegerField()
    expiry_date = models.DateField()
    description = models.TextField(blank=True)
    batch_number = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_expired(self):
        return self.expiry_date < date.today()

    @property
    def days_until_expiry(self):
        return (self.expiry_date - date.today()).days

    @property
    def expiry_status(self):
        days = self.days_until_expiry
        if days < 0:
            return 'expired'
        elif days <= 3:
            return 'critical'
        elif days <= 7:
            return 'warning'
        return 'good'

    def __str__(self):
        return f"{self.name} - {self.category}"
```

## 4. Serializers (products/serializers.py)

```python
from rest_framework import serializers
from .models import Product

class ProductSerializer(serializers.ModelSerializer):
    is_expired = serializers.ReadOnlyField()
    days_until_expiry = serializers.ReadOnlyField()
    expiry_status = serializers.ReadOnlyField()

    class Meta:
        model = Product
        fields = '__all__'
```

## 5. Views (products/views.py)

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Case, When, IntegerField
from datetime import date, timedelta
from .models import Product
from .serializers import ProductSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Produtos vencendo em X dias"""
        days = int(request.query_params.get('days', 7))
        expiry_date = date.today() + timedelta(days=days)
        products = Product.objects.filter(
            expiry_date__lte=expiry_date,
            expiry_date__gte=date.today()
        )
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def expired(self, request):
        """Produtos já vencidos"""
        products = Product.objects.filter(expiry_date__lt=date.today())
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estatísticas do dashboard"""
        today = date.today()
        
        stats = Product.objects.aggregate(
            total_products=Count('id'),
            expired=Count(Case(When(expiry_date__lt=today, then=1))),
            expiring_soon=Count(Case(
                When(expiry_date__gte=today, expiry_date__lte=today + timedelta(days=7), then=1)
            )),
            low_stock=Count(Case(When(quantity__lt=10, then=1)))
        )
        
        return Response(stats)
```

## 6. URLs (products/urls.py)

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet

router = DefaultRouter()
router.register(r'products', ProductViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/dashboard/stats/', ProductViewSet.as_view({'get': 'stats'}), name='dashboard-stats'),
]
```

## 7. URLs principais (inventory_backend/urls.py)

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('products.urls')),
]
```

## 8. Migrations e execução

```bash
# Criar migrations
python manage.py makemigrations

# Aplicar migrations
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Executar servidor
python manage.py runserver
```

## 9. Configuração de Tarefas Automáticas (Celery)

```python
# celery.py
from celery import Celery
import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inventory_backend.settings')

app = Celery('inventory_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# tasks.py em products/
from celery import shared_task
from django.core.mail import send_mail
from .models import Product
from datetime import date, timedelta

@shared_task
def check_expiring_products():
    """Verifica produtos vencendo e envia alertas"""
    tomorrow = date.today() + timedelta(days=1)
    expiring = Product.objects.filter(expiry_date=tomorrow)
    
    if expiring:
        products_list = "\n".join([f"- {p.name} (Lote: {p.batch_number})" for p in expiring])
        send_mail(
            'Alerta: Produtos vencendo amanhã',
            f'Os seguintes produtos vencem amanhã:\n\n{products_list}',
            'admin@empresa.com',
            ['gestor@empresa.com'],
        )
```

## 10. Endpoints da API

- `GET /api/products/` - Lista todos os produtos
- `POST /api/products/` - Cria novo produto
- `GET /api/products/{id}/` - Detalhes de um produto
- `PUT /api/products/{id}/` - Atualiza produto
- `DELETE /api/products/{id}/` - Remove produto
- `GET /api/products/expiring/?days=7` - Produtos vencendo em X dias
- `GET /api/products/expired/` - Produtos vencidos
- `GET /api/dashboard/stats/` - Estatísticas do dashboard

## Configuração no React

No arquivo `.env` do React:
```
REACT_APP_API_URL=https://pi2-stocksystem-backend.onrender.com
```

Agora seu frontend React pode consumir a API Django!