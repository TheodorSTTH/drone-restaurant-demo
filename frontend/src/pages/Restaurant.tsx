import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Building2, Users, MapPin, Pencil, Calendar, Package } from "lucide-react";
import { csrftoken } from "@/csrf";

interface RestaurantData {
  id: number;
  name: string;
  address: string;
  created_at: string;
}

interface Employee {
  id: number;
  username: string;
  email: string;
  joined_at: string;
}

interface RestaurantResponse {
  ok: boolean;
  is_admin: boolean;
  restaurant: RestaurantData;
  employees: Employee[];
}

export default function Restaurant() {
  useEffect(() => { document.title = "Kyte - Restaurant"; }, []);

  const [restaurant, setRestaurant] = useState<RestaurantData | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
  });

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/restaurant/", { credentials: "include" });
      if (response.ok) {
        const data: RestaurantResponse = await response.json();
        setRestaurant(data.restaurant);
        setEmployees(data.employees);
        setIsAdmin(data.is_admin);
        setEditForm({
          name: data.restaurant.name,
          address: data.restaurant.address,
        });
      } else {
        console.error("Feil ved henting av restaurantinfo");
      }
    } catch (error) {
      console.error("Feil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim()) {
      alert("Navnet kan ikke være tomt");
      return;
    }

    try {
      const response = await fetch("/api/restaurant/update/", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken(),
        },
        body: JSON.stringify({
          name: editForm.name,
          address: editForm.address,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRestaurant(data.restaurant);
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Feil: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Feil ved oppdatering:", error);
      alert("Kunne ikke oppdatere restauranten.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Laster restaurantinfo...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <Package className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg">No restaurant linked</p>
          <p className="text-sm mt-2">Please contact an administrator to link your account to a restaurant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Restaurant Info Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-lg bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{restaurant.name}</h2>
              <p className="text-sm text-muted-foreground">ID: #{restaurant.id}</p>
            </div>
          </div>

          {isAdmin && (
            <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Rediger
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rediger restaurantinfo</AlertDialogTitle>
                <AlertDialogDescription>
                  Oppdater navn og adresse for restauranten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">Navn *</label>
                  <Input
                    placeholder="Restaurantnavn"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    placeholder="Gateadresse 123"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleUpdate}>
                  Lagre
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex gap-3">
            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Adresse</h3>
              <p className="text-base">{restaurant.address || "Ingen adresse registrert"}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Opprettet</h3>
              <p className="text-base">
                {new Date(restaurant.created_at).toLocaleString("no-NO", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employees Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h3 className="text-xl font-semibold">Ansatte</h3>
          <span className="text-sm text-muted-foreground">({employees.length})</span>
        </div>

        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen ansatte registrert</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{employee.username}</h4>
                  </div>
                  {employee.email && (
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Member since{" "}
                    {new Date(employee.joined_at).toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}