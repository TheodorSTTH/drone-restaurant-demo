from django.conf import settings
from django.db import models


class EndUser(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"EndUser #{self.pk}"

class Product(models.Model):
    name = models.CharField(max_length=200)
    restaurant = models.ForeignKey("Restaurant", on_delete=models.CASCADE, related_name="products")
    description = models.TextField(max_length=1000, blank=True)
    price_NOK = models.PositiveIntegerField(default=200)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Order(models.Model):
    end_user = models.ForeignKey("EndUser", on_delete=models.CASCADE, related_name="orders")
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Order #{self.pk}"

class OrderProduct(models.Model):
    order = models.ForeignKey("Order", on_delete=models.CASCADE, related_name="order_products")
    product = models.ForeignKey("Product", on_delete=models.CASCADE, related_name="order_products")
    quantity = models.PositiveIntegerField(default=1)
    unit_price_NOK = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        constraints = [models.UniqueConstraint(fields=["order","product"], name="uniq_order_product_once")]
    
    def __str__(self):
        return f"Order #{self.order.pk} • {self.product.name}"

class OrderAnswer(models.Model):
    class OrderAnswerStatus(models.TextChoices):
        ACCEPTED = "a", "Accepted"
        REJECTED = "r", "Rejected"
    order = models.ForeignKey("Order", on_delete=models.CASCADE, related_name="order_answers")
    status = models.CharField(max_length=2, choices=OrderAnswerStatus.choices, default=OrderAnswerStatus.ACCEPTED)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"OrderAnswer #{self.pk}"

class Preparation(models.Model):
    order_answer = models.ForeignKey("OrderAnswer", on_delete=models.CASCADE, related_name="preparations")
    
    def __str__(self):
        return f"Preparation #{self.pk}"

class PreparationStep(models.Model):
    class PreparationStatus(models.TextChoices):
        DELAYED = "de", "Delayed"
        DONE = "d", "Done"
        CANCELLED = "c", "Cancelled"
    preparation = models.ForeignKey("Preparation", on_delete=models.CASCADE, related_name="steps")
    status = models.CharField(max_length=2, choices=PreparationStatus.choices, default=PreparationStatus.DELAYED)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"PreparationStep #{self.pk}"

class Delivery(models.Model):
    order = models.OneToOneField("Order", on_delete=models.CASCADE, related_name="delivery")
    has_been_picked_up = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Delivery #{self.pk}"

class Restaurant(models.Model):
    name = models.CharField(max_length=200)
    address = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class AuthUserRestaurant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auth_user_restaurants")
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="auth_user_restaurants")
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["user"], name="unique_user_restaurant")]
    def __str__(self): return self.user.username
