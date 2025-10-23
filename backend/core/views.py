from business_logic.models import (
    EndUser,
    Product,
    Order,
    OrderProduct,
    OrderAnswer,
    Restaurant,
    AuthUserRestaurant,
    Preparation,
    PreparationStep,
    Delivery,
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
from django.utils import timezone
from datetime import timedelta

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
        "is_admin": user.is_staff or user.is_superuser,
        "date_joined": getattr(user, "date_joined", None).isoformat() if getattr(user, "date_joined", None) else None
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

    # Mark as cancelled (idempotent)
    if not order.is_cancelled:
        order.is_cancelled = True
        order.save(update_fields=["is_cancelled"])
    return JsonResponse({"ok": True, "cancelled_order_id": order_id, "is_cancelled": True})


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

    projected_minutes = None
    try:
        body = _json(request)
        projected_minutes = int(body.get("projected_preparation_time_minutes")) if body.get("projected_preparation_time_minutes") is not None else None
    except Exception:
        projected_minutes = None

    kwargs = {"order": order, "status": status_code}
    if projected_minutes is not None and projected_minutes >= 0 and status_code == OrderAnswer.OrderAnswerStatus.ACCEPTED:
        kwargs["projected_preparation_time_minutes"] = projected_minutes

    ans = OrderAnswer.objects.create(**kwargs)

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
@require_GET
def notifications_list(request):
    """
    GET /api/notifications/
    Returns notifications for the authenticated user's restaurant
    """
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    notifs = restaurant.notifications.order_by("-created_at")[0:50]
    return JsonResponse({
        "ok": True,
        "notifications": [
            {
                "id": n.id,
                "message": n.message,
                "read": n.read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
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
        .filter(is_cancelled=False, order_products__product__restaurant=restaurant)
        .distinct()
        .order_by("-created_at")
    )

    in_progress_qs = (
        base_qs
        .filter(order_answers__status=OrderAnswer.OrderAnswerStatus.ACCEPTED)
        .exclude(
            order_answers__preparations__steps__status__in=[
                PreparationStep.PreparationStatus.DONE,
                PreparationStep.PreparationStatus.CANCELLED,
            ]
        )
        .distinct()
    )
    awaiting_pickup_qs = base_qs.filter(
        order_answers__preparations__steps__status=PreparationStep.PreparationStatus.DONE
    ).distinct()
    # Orders with no answers yet (new/unprocessed)
    new_orders_qs = base_qs.filter(order_answers__isnull=True).distinct()

    def serialize_order(o: Order, include_accepted_at: bool = False):
        items = [
            {
                "product_id": op.product.id,
                "product_name": op.product.name,
                "quantity": op.quantity,
                "unit_price_NOK": op.unit_price_NOK,
            }
            for op in o.order_products.select_related("product").all()
        ]
        data = {
            "id": o.id,
            "created_at": o.created_at.isoformat(),
            "items": items,
        }
        # Attach delivery info if exists (avoid DoesNotExist from one-to-one access)
        try:
            d = o.delivery
        except Delivery.DoesNotExist:
            d = None
        if d is not None:
            data["delivery"] = {
                "estimated_pickup_time": d.estimated_pickup_time.isoformat(),
                "estimated_delivery_time": d.estimated_delivery_time.isoformat(),
            }
        if include_accepted_at:
            ans = (
                OrderAnswer.objects
                .filter(order=o, status=OrderAnswer.OrderAnswerStatus.ACCEPTED)
                .order_by("-created_at")
                .first()
            )
            if ans:
                data["accepted_at"] = ans.created_at.isoformat()
                data["projected_preparation_time_minutes"] = getattr(ans, "projected_preparation_time_minutes", None)
                # Sum delay minutes across all steps for preparations under this answer
                total_delay = 0
                for prep in ans.preparations.all():
                    total_delay += sum(s.delaytime_minutes for s in prep.steps.all())
                data["total_delay_minutes"] = total_delay
        return data

    return JsonResponse(
        {
            "ok": True,
            "all_orders": [serialize_order(o) for o in base_qs],
            "new_orders": [serialize_order(o) for o in new_orders_qs],
            "in_progress_orders": [serialize_order(o, include_accepted_at=True) for o in in_progress_qs],
            "awaiting_pickup_orders": [serialize_order(o) for o in awaiting_pickup_qs],
        }
    )


@require_POST
@login_required
@transaction.atomic
def preparation_step_create(request):
    """
    POST /api/preparation_step/
    Body: { "order_id": 123, "status": "de"|"d"|"c" }
    Creates a PreparationStep for the given order. If no Preparation exists on the
    accepted OrderAnswer, a Preparation will be created.
    """
    try:
        body = _json(request)
    except ValueError as e:
        return _bad(str(e))

    order_id = body.get("order_id")
    status = body.get("status")
    delay_minutes = int(body.get("delaytime_minutes", 0) or 0)
    if not order_id:
        return _bad("order_id is required")
    if status not in {
        PreparationStep.PreparationStatus.DELAYED,
        PreparationStep.PreparationStatus.DONE,
        PreparationStep.PreparationStatus.CANCELLED,
    }:
        return _bad("invalid status; must be one of: de, d, c")
    if delay_minutes < 0:
        return _bad("delaytime_minutes must be >= 0")

    # Find order
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return _bad(f"Order not found: {order_id}", status=404)

    # Ensure the order belongs to the current user's restaurant
    try:
        user_restaurant = AuthUserRestaurant.objects.get(user=request.user)
        restaurant = user_restaurant.restaurant
    except AuthUserRestaurant.DoesNotExist:
        return _bad("User is not linked to any restaurant", status=404)

    if not order.order_products.filter(product__restaurant=restaurant).exists():
        return _bad("Order does not belong to your restaurant", status=403)

    # Find accepted answer
    ans = (
        OrderAnswer.objects
        .filter(order=order, status=OrderAnswer.OrderAnswerStatus.ACCEPTED)
        .order_by("-created_at")
        .first()
    )
    if not ans:
        return _bad("Order is not in progress (no accepted answer)", status=409)

    # Find or create preparation
    prep = ans.preparations.first()
    if prep is None:
        prep = Preparation.objects.create(order_answer=ans)

    step = PreparationStep.objects.create(preparation=prep, status=status, delaytime_minutes=delay_minutes)

    # If marked as DONE, ensure a Delivery exists with estimated timestamps
    if status == PreparationStep.PreparationStatus.DONE:
        # Ensure delivery exists; create with estimated times if missing
        pickup_time = timezone.now() + timedelta(minutes=5)
        delivery_time = timezone.now() + timedelta(minutes=15)
        Delivery.objects.get_or_create(
            order=order,
            defaults={
                "estimated_pickup_time": pickup_time,
                "estimated_delivery_time": delivery_time,
            },
        )
    elif status == PreparationStep.PreparationStatus.CANCELLED:
        # Mark the order as cancelled as part of prep flow
        if not order.is_cancelled:
            order.is_cancelled = True
            order.save(update_fields=["is_cancelled"])

    # Provide CSRF cookie for further SPA requests
    get_token(request)

    # compute updated total delay minutes
    total_delay = 0
    for p in ans.preparations.all():
        total_delay += sum(s.delaytime_minutes for s in p.steps.all())

    return JsonResponse({
        "ok": True,
        "preparation": {"id": prep.id},
        "step": {
            "id": step.id,
            "status": step.status,
            "created_at": step.created_at.isoformat(),
            "delaytime_minutes": step.delaytime_minutes,
        },
        "total_delay_minutes": total_delay,
    }, status=201)