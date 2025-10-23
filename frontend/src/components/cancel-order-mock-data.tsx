import { useEffect, useState } from "react";
import { Trash } from "lucide-react";
import { Button } from "./ui/button";
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
import { csrftoken } from "@/csrf";

interface ApiOrderItem {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price_NOK: number;
}

interface ApiOrder {
    id: number;
    created_at: string;
    items: ApiOrderItem[];
}

export default function CancelOrderMockData() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newOrders, setNewOrders] = useState<ApiOrder[]>([]);
    const [inProgressOrders, setInProgressOrders] = useState<ApiOrder[]>([]);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const fetchOrders = async () => {
            setLoading(true);
            try {
                const r = await fetch("/api/orders/", { credentials: "include" });
                if (r.ok) {
                    const data = await r.json();
                    if (!cancelled) {
                        setNewOrders(data.new_orders || []);
                        setInProgressOrders(data.in_progress_orders || []);
                    }
                }
            } catch (e) {
                console.error("Failed to load orders", e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchOrders();
        return () => {
            cancelled = true;
        };
    }, [isOpen]);

    const cancelOrder = async (orderId: number) => {
        try {
            setDeletingId(orderId);
            const res = await fetch("/api/order_cancelled/", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken(),
                },
                body: JSON.stringify({ order_id: orderId }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to cancel order");
            }
            // Optimistisk oppdatering av lokal liste
            setNewOrders((prev) => prev.filter((o) => o.id !== orderId));
            setInProgressOrders((prev) => prev.filter((o) => o.id !== orderId));
            try {
                window.dispatchEvent(new CustomEvent("order:cancelled", { detail: { id: orderId } }));
                window.dispatchEvent(new Event("orders:refresh"));
            } catch {}
            // Lukk dialog hvis ingen ordrer gjenstår
            const remaining = (newOrders.length - 1) + (inProgressOrders.length - 1);
            if (remaining <= 0) {
                setIsOpen(false);
            }
        } catch (e) {
            console.error(e);
            alert("Could not cancel order");
        } finally {
            setDeletingId(null);
        }
    };

    const renderOrder = (o: ApiOrder) => {
        const total = o.items.reduce((sum, it) => sum + it.unit_price_NOK * it.quantity, 0);
        return (
            <div key={o.id} className="p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium">Order #{o.id}</h4>
                            <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                            {o.items.map((it) => (
                                <div key={`${o.id}-${it.product_id}`} className="text-sm text-muted-foreground flex justify-between">
                                    <span>{it.product_name} × {it.quantity}</span>
                                    <span>{it.unit_price_NOK * it.quantity} NOK</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between text-sm font-semibold">
                            <span>Total</span>
                            <span>{total} NOK</span>
                        </div>
                        <div className="mt-3">
                            <Button size="sm" variant="destructive" onClick={() => cancelOrder(o.id)} disabled={deletingId === o.id}>
                                {deletingId === o.id ? "Cancelling…" : "Cancel order"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
                <Button 
                    variant="outline"
                    className="fixed bottom-6 right-20 h-10 w-10 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
                    title="Cancel Test Order"
                >
                    <Trash className="size-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Orders (Mock)</AlertDialogTitle>
                    <AlertDialogDescription>
                        Browse orders and in-progress orders. Buttons are disabled in this mock.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {loading ? (
                    <div className="py-6 text-sm text-muted-foreground">Loading…</div>
                ) : (
                    <div className="space-y-6 py-2">
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">Orders</h3>
                            {newOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No orders</p>
                            ) : (
                                newOrders.map(renderOrder)
                            )}
                        </section>
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold">In progress</h3>
                            {inProgressOrders.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No orders in progress</p>
                            ) : (
                                inProgressOrders.map(renderOrder)
                            )}
                        </section>
                    </div>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel>Close</AlertDialogCancel>
                    <AlertDialogAction disabled>Cancel selected</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}