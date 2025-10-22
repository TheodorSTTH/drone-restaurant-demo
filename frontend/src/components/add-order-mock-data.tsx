import { useState, useEffect } from "react";
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ShoppingCart } from "lucide-react"
import { csrftoken } from "@/csrf"

interface Product {
    id: number;
    name: string;
    price_NOK: number;
}

interface OrderProduct {
    product_id: number;
    quantity: number;
}

export default function AddOrderMockData() {
    const [isOpen, setIsOpen] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedProducts, setSelectedProducts] = useState<{ [key: number]: number }>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        try {
            const response = await fetch("/api/products/", { credentials: "include" });
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        }
    };

    const handleQuantityChange = (productId: number, quantity: string) => {
        const qty = parseInt(quantity) || 0;
        if (qty > 0) {
            setSelectedProducts({ ...selectedProducts, [productId]: qty });
        } else {
            const updated = { ...selectedProducts };
            delete updated[productId];
            setSelectedProducts(updated);
        }
    };

    const handleCreateOrder = async () => {
        const productsToOrder: OrderProduct[] = Object.entries(selectedProducts).map(
            ([product_id, quantity]) => ({
                product_id: parseInt(product_id),
                quantity: quantity,
            })
        );

        if (productsToOrder.length === 0) {
            alert("Please select at least one product");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/order_created/", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken(),
                },
                body: JSON.stringify({
                    products: productsToOrder,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                try {
                    window.dispatchEvent(new CustomEvent("order:created", { detail: data.order }));
                } catch {}
                // alert(`Order created successfully! Order ID: ${data.order.id}`);
                setSelectedProducts({});
                setIsOpen(false);
            } else {
                const errorData = await response.json();
                alert(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error("Error creating order:", error);
            alert("Could not create order");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
                <AlertDialogTrigger asChild>
                    <Button 
                        variant="outline"
                        className="fixed bottom-6 right-6 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
                        title="Add Test Order"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create Test Order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select products and quantities to create a test order. This simulates a customer order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="py-4">
                        {products.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                                <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                <p>No products available. Create some products first.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {products.map((product) => (
                                    <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <p className="font-medium">{product.name}</p>
                                            <p className="text-sm text-muted-foreground">{product.price_NOK} NOK</p>
                                        </div>
                                        <div className="w-24">
                                            <Input
                                                type="number"
                                                min="0"
                                                placeholder="0"
                                                value={selectedProducts[product.id] || ""}
                                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateOrder} disabled={loading || products.length === 0}>
                            {loading ? "Creating..." : "Create Order"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
  