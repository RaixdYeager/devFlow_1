from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    # DevFlow API
    path("api/accounts/", include("accounts.urls")),
]