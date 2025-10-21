from django.http import JsonResponse

def ping(request):
    return JsonResponse({"message": "Hello, drones! Backend is alive."})
