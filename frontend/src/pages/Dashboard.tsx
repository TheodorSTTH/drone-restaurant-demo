import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function OrderCard({ order, showActions, onAccept, onDecline }: { order: ApiOrder; showActions?: boolean; onAccept?: (id: number) => void; onDecline?: (id: number) => void; }) {
    const total = order.items.reduce((sum, it) => sum + it.unit_price_NOK * it.quantity, 0);
    return (
        <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Order #{order.id}</h3>
                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                        {order.items.map((it) => (
                            <div key={`${order.id}-${it.product_id}`} className="text-sm text-muted-foreground flex justify-between">
                                <span>{it.product_name} × {it.quantity}</span>
                                <span>{it.unit_price_NOK * it.quantity} NOK</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-3 flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{total} NOK</span>
                    </div>
                    {showActions && (
                        <div className="mt-3 flex gap-2 w-full">
                            <Button size="sm" variant="outline" onClick={() => onDecline && onDecline(order.id)}>Decline</Button>
                            <Button size="sm" className="grow" variant="default" onClick={() => onAccept && onAccept(order.id)}>Accept</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [newOrders, setNewOrders] = useState<ApiOrder[]>([]);
    const [inProgressOrders, setInProgressOrders] = useState<ApiOrder[]>([]);
    const [awaitingPickupOrders, setAwaitingPickupOrders] = useState<ApiOrder[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = () => {
        setLoading(true);
        fetch("/api/orders/", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data) => {
                setNewOrders(data.new_orders || []);
                setInProgressOrders(data.in_progress_orders || []);
                setAwaitingPickupOrders(data.awaiting_pickup_orders || []);
            })
            .catch((e) => console.error("Failed to load orders", e))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchOrders();
        const onCreated = () => fetchOrders();
        window.addEventListener("order:created", onCreated as EventListener);
        return () => window.removeEventListener("order:created", onCreated as EventListener);
    }, []);

    const acceptOrder = async (orderId: number) => {
        try {
            const res = await fetch("/api/preparation_accepted/", {
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
                throw new Error(err.error || "Failed to accept order");
            }
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert("Could not accept order");
        }
    };

    const declineOrder = async (orderId: number) => {
        try {
            const res = await fetch("/api/preparation_rejected/", {
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
                throw new Error(err.error || "Failed to decline order");
            }
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert("Could not decline order");
        }
    };

    useEffect(() => { document.title = "Kyte - Dashboard"; }, []);

    if (loading) {
        return <div className="p-6">Loading orders…</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Orders</h2>
                {newOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders</p>
                ) : (
                    newOrders.map((o) => (
                        <OrderCard key={o.id} order={o} showActions onAccept={acceptOrder} onDecline={declineOrder} />
                    ))
                )}
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">In progress</h2>
                {inProgressOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders in progress</p>
                ) : (
                    inProgressOrders.map((o) => <OrderCard key={o.id} order={o} />)
                )}
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Awaiting pickup</h2>
                {awaitingPickupOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders awaiting pickup</p>
                ) : (
                    awaitingPickupOrders.map((o) => <OrderCard key={o.id} order={o} />)
                )}
            </section>
        </div>
    );
}