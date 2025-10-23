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
import { Plus, Package } from "lucide-react";
import { csrftoken } from "@/csrf";

interface Product {
  id: number;
  name: string;
  restaurant_id: number;
  restaurant_name: string;
  price_NOK: number;
  description: string;
  created_at: string;
}

export default function Products() {
    useEffect(() => { document.title = "Kyte - Products"; }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [noRestaurant, setNoRestaurant] = useState(false);

  // Form state for new product
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price_NOK: "",
  });

  // Fetch products on mount
    useEffect(() => {
    fetchProducts();
    }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    setNoRestaurant(false);
    try {
      const response = await fetch("/api/products/", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      } else if (response.status === 404) {
        const errorData = await response.json();
        if (errorData.error?.includes("not linked to any restaurant")) {
          setNoRestaurant(true);
        }
      } else {
        console.error("Feil ved henting av produkter");
      }
    } catch (error) {
      console.error("Feil:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price_NOK) {
      alert("Please fill out all required fields");
      return;
    }

    try {
      const response = await fetch("/api/product_create/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken(),
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price_NOK: parseInt(newProduct.price_NOK),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProducts([data.product, ...products]);
        setSelectedProduct(data.product);
        setNewProduct({ name: "", description: "", price_NOK: "" });
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error when creating product:", error);
      alert("Could not create product.");
    }
  };

  if (noRestaurant) {
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
    <div className="flex gap-4 h-full">
      {/* Venstre kolonne - Produktliste */}
      <div className="w-64 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          {/* <h2 className="text-lg font-semibold">Products</h2> */}
          <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant={'outline'} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create a new product</AlertDialogTitle>
                <AlertDialogDescription>
                  Fill out the information about the product below.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <label className="text-sm font-medium">Name *</label>
                  <Input
                    placeholder="Veggie Roll"
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Price (NOK) *</label>
                  <Input
                    type="number"
                    placeholder="189"
                    value={newProduct.price_NOK}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, price_NOK: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    placeholder="Fresh vegetables in a crispy roll..."
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateProduct}>
                  Create
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground">No products yet. Create the first one!</div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedProduct?.id === product.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.price_NOK} NOK</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Høyre panel - Produktdetaljer */}
      <div className="flex-1 rounded-lg border bg-card p-6">
        {selectedProduct ? (
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-lg bg-primary/10">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{selectedProduct.name}</h2>
                <p className="text-muted-foreground">ID: #{selectedProduct.id}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Pris</h3>
                <p className="text-3xl font-bold">{selectedProduct.price_NOK} NOK</p>
              </div>

              {selectedProduct.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Beskrivelse
                  </h3>
                  <p className="text-base">{selectedProduct.description}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Restaurant
                </h3>
                <p className="text-base">{selectedProduct.restaurant_name}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Opprettet
                </h3>
                <p className="text-base">
                  {new Date(selectedProduct.created_at).toLocaleString("no-NO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Package className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg">Choose a product to see details</p>
          </div>
        )}
      </div>
    </div>
  );
}