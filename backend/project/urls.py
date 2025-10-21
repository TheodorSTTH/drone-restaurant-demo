from django.contrib import admin
from django.urls import path, include
from core.views import ping, signup, me, protected_data
from django.views.generic.base import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ping", ping),
    path("accounts/", include("django.contrib.auth.urls")),  # login/logout/password reset
    path("accounts/signup/", signup),                        # simple signup
    path("api/me", me),                                      # example: current user (requires login)
    path("api/protected-data", protected_data),              # example protected endpoint
    
    path("accounts/profile/", RedirectView.as_view(url="/", permanent=False)),
]