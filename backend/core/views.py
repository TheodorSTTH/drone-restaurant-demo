from django.http import JsonResponse, HttpResponseRedirect
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET, require_POST
from django.middleware.csrf import get_token
from django.shortcuts import render, redirect

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

@login_required
@require_GET
def me(request):
    user = request.user
    return JsonResponse({"id": user.id, "username": user.username, "email": user.email})

@login_required
@require_GET
def protected_data(request):
    return JsonResponse({"orders": [], "note": "You are authenticated!"})
