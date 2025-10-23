from django.contrib import admin
from django.urls import path, include
from core.views import ping, signup, me, protected_data, order_created, order_cancelled, preparation_accepted, preparation_rejected, product_create, product_list, restaurant_info, restaurant_update, orders_list, preparation_step_create, notifications_list, notification_mark_read, notifications_mark_all_read
from django.views.generic.base import RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),  # login/logout/password reset
    path("accounts/signup/", signup),                        # simple signup


    path("api/ping/", ping),
    path("api/me/", me),                                     # example: current user (requires login)
    path("api/protected-data/", protected_data),

    path("api/order_created/", order_created),
    path("api/order_cancelled/", order_cancelled),
    path("api/preparation_accepted/", preparation_accepted),
    path("api/preparation_rejected/", preparation_rejected),
    path("api/products/", product_list),
    path("api/product_create/", product_create),
    path("api/restaurant/", restaurant_info),
    path("api/restaurant/update/", restaurant_update),
    path("api/orders/", orders_list),
    path("api/preparation_step/", preparation_step_create),
    path("api/notifications/", notifications_list),
    path("api/notifications/mark-read/<int:notification_id>/", notification_mark_read),
    path("api/notifications/mark-all-read/", notifications_mark_all_read),
    
    path("accounts/profile/", RedirectView.as_view(url="/", permanent=False)),
]