from business_logic.models import (
    EndUser,
    Product,
    Order,
    OrderProduct,
    OrderAnswer,
    Restaurant,
    AuthUserRestaurant,
    PreparationStep,
)
import json
import uuid
from django.shortcuts import render, redirect
from django.contrib.auth.forms import UserCreationForm
from django.db import transaction, IntegrityError
from django.http import JsonResponse, HttpResponseRedirect, HttpResponseBadRequest, HttpResponseNotAllowed
from django.views.decorators.http import require_POST, require_GET
from django.contrib.auth.decorators import login_required
from django.middleware.csrf import get_token

@require_GET
def ping(request):
    # sets a CSRF cookie too (handy for SPA POSTs)
    get_token(request)
    return JsonResponse({"message": "Hello, drones! Backend is alive."})

def signup(request):
    if request.method == "POST":
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect("/accounts/login/?registered=1")
    else:
        form = UserCreationForm()
    return render(request, "signup.html", {"form": form})

@require_GET
def me(request):
    # Check if user is authenticated - return 401 instead of redirect for SPAs
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Not authenticated"}, status=401)
    
    user = request.user
    restaurant_id = None
    restaurant_name = None
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=user)
        restaurant_id = user_restaurant.restaurant.id
        restaurant_name = user_restaurant.restaurant.name
    except AuthUserRestaurant.DoesNotExist:
        pass
    
    return JsonResponse({
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "restaurant_id": restaurant_id,
        "restaurant_name": restaurant_name,
        "is_admin": user.is_staff or user.is_superuser
    })

@login_required
@require_GET
def protected_data(request):
    return JsonResponse({"orders": [], "note": "You are authenticated!"})





def _json(request):
    try:
        return json.loads(request.body.decode("utf-8"))
    except Exception:
        raise ValueError("Invalid JSON")

def _bad(msg, status=400):
    return JsonResponse({"error": msg}, status=status)

@login_required
@require_GET
def product_list(request):
    """
    GET /api/products
    Returns all products for the authenticated user's restaurant
    """
    # 1) find user's restaurant
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    # 2) fetch products
    products = Product.objects.filter(restaurant=restaurant).order_by('-created_at')
    
    return JsonResponse({
        "ok": True,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "restaurant_id": restaurant.id,
                "restaurant_name": restaurant.name,
                "price_NOK": p.price_NOK,
                "description": p.description,
                "created_at": p.created_at.isoformat(),
            }
            for p in products
        ]
    })


@login_required
@require_POST
@transaction.atomic
def product_create(request):
    """
    POST /api/product_create
    Body:
    {
      "name": "Veggie Roll",
      "description": "…",            // optional
      "price_NOK": 189               // integer (NOK)
    }
    restaurant_id is automatically determined from the logged-in user.
    product_id is auto-generated if not provided.
    """
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    name = body.get("name")
    description = body.get("description", "")
    price_NOK = body.get("price_NOK")

    if not name or not isinstance(price_NOK, int):
        return _bad("name and integer price_NOK are required")

    # 1) find user's restaurant
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    # 2) create product (product_id will be auto-generated)
    try:
        p = Product.objects.create(
            name=name,
            restaurant=restaurant,
            description=description,
            price_NOK=price_NOK,
        )
    except IntegrityError as e:
        return _bad(f"Error creating product: {str(e)}", status=409)

    return JsonResponse(
        {
            "ok": True,
            "product": {
                "id": p.id,
                "name": p.name,
                "restaurant_id": restaurant.id,
                "restaurant_name": restaurant.name,
                "price_NOK": p.price_NOK,
                "description": p.description,
                "created_at": p.created_at.isoformat(),
            },
        },
        status=201,
    )




@require_POST
@login_required
@transaction.atomic
def order_created(request):
    """
    Body:
    {
      "products": [
         {"product_id": 1, "quantity": 2, "unit_price_NOK": 199},
         {"product_id": 2, "quantity": 1}  // unit_price_NOK optional -> default from Product
      ]
    }
    Creates a new order with auto-generated IDs for a new EndUser.
    """
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    products = body.get("products", [])

    # Create EndUser (auto-generates ID)
    end_user = EndUser.objects.create()

    # Create Order (auto-generates ID)
    order = Order.objects.create(end_user=end_user)

    # Attach products
    item_results = []
    for item in products:
        pid = item.get("product_id")
        if not pid:
            transaction.set_rollback(True)
            return _bad("Each product row must include product_id (integer)")
        try:
            product = Product.objects.get(id=pid)
        except Product.DoesNotExist:
            transaction.set_rollback(True)
            return _bad(f"Product not found: {pid}", status=404)

        qty = int(item.get("quantity", 1))
        if qty < 1:
            transaction.set_rollback(True)
            return _bad("quantity must be >= 1")

        unit_price = item.get("unit_price_NOK", product.price_NOK)
        op = OrderProduct.objects.create(
            order=order,
            product=product,
            quantity=qty,
            unit_price_NOK=unit_price,
        )
        item_results.append({
            "product_id": product.id,
            "product_name": product.name,
            "quantity": qty,
            "unit_price_NOK": unit_price,
        })

    # Ensure the CSRF cookie exists for subsequent POSTs from the SPA
    get_token(request)

    return JsonResponse({
        "ok": True,
        "order": {
            "id": order.id,
            "end_user_id": end_user.id,
            "created_at": order.created_at.isoformat()
        },
        "items": item_results,
    }, status=201)


@require_POST
@login_required
@transaction.atomic
def order_cancelled(request):
    """
    Body: { "order_id": 123 }  // integer ID
    Deletes the order (cascades OrderProduct, OrderAnswer, Delivery, etc.).
    """
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    order_id = body.get("order_id")
    if not order_id:
        return _bad("order_id is required")

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return _bad(f"Order not found: {order_id}", status=404)

    order.delete()
    return JsonResponse({"ok": True, "deleted_order_id": order_id})


def _create_order_answer(request, status_code: str):
    """
    Shared helper for accepted/rejected endpoints.

    Body:
    {
      "order_id": 123  // integer ID
    }
    """
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    order_id = body.get("order_id")
    if not order_id:
        return _bad("order_id is required")

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return _bad(f"Order not found: {order_id}", status=404)

    ans = OrderAnswer.objects.create(
        order=order,
        status=status_code,
    )

    # Also send a CSRF cookie for subsequent SPA writes
    get_token(request)

    return JsonResponse({
        "ok": True,
        "order_answer": {
            "id": ans.id,
            "order_id": order.id,
            "status": ans.status,
            "created_at": ans.created_at.isoformat(),
        }
    }, status=201)


@require_POST
@login_required
@transaction.atomic
def preparation_accepted(request):
    # status "a" in your choices
    return _create_order_answer(request, OrderAnswer.OrderAnswerStatus.ACCEPTED)


@require_POST
@login_required
@transaction.atomic
def preparation_rejected(request):
    return _create_order_answer(request, OrderAnswer.OrderAnswerStatus.REJECTED)


@login_required
@require_GET
def restaurant_info(request):
    """
    GET /api/restaurant/
    Returns restaurant info and employees for the authenticated user's restaurant
    """
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    # Fetch all employees (users linked to this restaurant)
    employees = AuthUserRestaurant.objects.filter(restaurant=restaurant).select_related('user')
    
    return JsonResponse({
        "ok": True,
        "is_admin": request.user.is_staff or request.user.is_superuser,
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "created_at": restaurant.created_at.isoformat(),
        },
        "employees": [
            {
                "id": emp.user.id,
                "username": emp.user.username,
                "email": emp.user.email,
                "joined_at": emp.created_at.isoformat(),
            }
            for emp in employees
        ]
    })


@login_required
@transaction.atomic
def restaurant_update(request):
    """
    PATCH /api/restaurant/
    Body:
    {
      "name": "New Restaurant Name",     // optional
      "address": "New Address 123"       // optional
    }
    Updates restaurant info for the authenticated user's restaurant
    Only allowed for admin users (staff or superuser)
    """
    if request.method != "PATCH":
        return _bad("Method not allowed", status=405)
    
    # Check if user is admin
    if not (request.user.is_staff or request.user.is_superuser):
        return _bad("Only administrators can update restaurant details", status=403)
    
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    # Update fields if provided
    if "name" in body:
        name = body["name"]
        if not name or not isinstance(name, str):
            return _bad("name must be a non-empty string")
        restaurant.name = name

    if "address" in body:
        address = body["address"]
        if not isinstance(address, str):
            return _bad("address must be a string")
        restaurant.address = address

    restaurant.save()

    return JsonResponse({
        "ok": True,
        "restaurant": {
            "id": restaurant.id,
            "name": restaurant.name,
            "address": restaurant.address,
            "created_at": restaurant.created_at.isoformat(),
        }
    })


@login_required
@require_GET
def orders_list(request):
    """
    GET /api/orders/
    Returns three groups of orders for the authenticated user's restaurant:
    - all_orders
    - in_progress_orders (has an accepted OrderAnswer)
    - awaiting_pickup_orders (has a PreparationStep with status DONE)
    """
    # Identify restaurant for current user
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    # Base queryset: orders that include at least one product from this restaurant
    base_qs = (
        Order.objects
        .filter(order_products__product__restaurant=restaurant)
        .distinct()
        .order_by("-created_at")
    )

    in_progress_qs = base_qs.filter(order_answers__status=OrderAnswer.OrderAnswerStatus.ACCEPTED).distinct()
    awaiting_pickup_qs = base_qs.filter(
        order_answers__preparations__steps__status=PreparationStep.PreparationStatus.DONE
    ).distinct()
    # Orders with no answers yet (new/unprocessed)
    new_orders_qs = base_qs.filter(order_answers__isnull=True).distinct()

    def serialize_order(o: Order):
        items = [
            {
                "product_id": op.product.id,
                "product_name": op.product.name,
                "quantity": op.quantity,
                "unit_price_NOK": op.unit_price_NOK,
            }
            for op in o.order_products.select_related("product").all()
        ]
        return {
            "id": o.id,
            "created_at": o.created_at.isoformat(),
            "items": items,
        }

    return JsonResponse(
        {
            "ok": True,
            "all_orders": [serialize_order(o) for o in base_qs],
            "new_orders": [serialize_order(o) for o in new_orders_qs],
            "in_progress_orders": [serialize_order(o) for o in in_progress_qs],
            "awaiting_pickup_orders": [serialize_order(o) for o in awaiting_pickup_qs],
        }
    )