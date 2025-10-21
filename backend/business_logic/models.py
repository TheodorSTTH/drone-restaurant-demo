from django.conf import settings
from django.db import models


class EndUser(models.Model):
    end_user_id = models.CharField(max_length=200, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.end_user_id

class Product(models.Model):
    product_id = models.CharField(max_length=200, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(max_length=1000, blank=True)
    price_NOK = models.PositiveIntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Order(models.Model):
    order_id = models.CharField(max_length=200, unique=True)
    end_user = models.ForeignKey("EndUser", on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.order_id

class OrderProduct(models.Model):
    order = models.ForeignKey("Order", on_delete=models.CASCADE, related_name="order_products")
    product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="order_products")
    quantity = models.PositiveIntegerField(default=1)
    unit_price_NOK = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["order","product"], name="uniq_order_product_once")]
    def __str__(self): return f"{self.order.order_id} • {self.product.name}"

class OrderAnswer(models.Model):
    order_answer_id = models.CharField(max_length=200, unique=True)
    order = models.ForeignKey("Order", on_delete=models.CASCADE, related_name="order_answers")
    def __str__(self): return self.order_answer_id

class Preparation(models.Model):
    preparation_id = models.CharField(max_length=200, unique=True)
    order_answer = models.ForeignKey("OrderAnswer", on_delete=models.CASCADE, related_name="preparations")
    def __str__(self): return self.preparation_id

class PreparationStep(models.Model):
    class PreparationStatus(models.TextChoices):
        DELAYED = "de", "Delayed"
        DONE = "d", "Done"
        CANCELLED = "c", "Cancelled"
    preparation_step_id = models.CharField(max_length=200, unique=True)
    preparation = models.ForeignKey("Preparation", on_delete=models.CASCADE, related_name="steps")
    status = models.CharField(max_length=2, choices=PreparationStatus.choices, default=PreparationStatus.DELAYED)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.preparation_step_id

class Delivery(models.Model):
    delivery_id = models.CharField(max_length=200, unique=True)
    order = models.OneToOneField("Order", on_delete=models.CASCADE, related_name="delivery")
    has_been_picked_up = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.delivery_id

class Restaurant(models.Model):
    restaurant_id = models.CharField(max_length=200, unique=True)
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class AuthUserRestaurant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_user_restaurants")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="auth_user_restaurants")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user"], name="unique_user_restaurant")]
    def __str__(self): return self.user.username
