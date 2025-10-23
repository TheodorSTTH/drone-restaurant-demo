import { useEffect, useState } from "react";
import { Package } from "lucide-react";
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
    accepted_at?: string;
    projected_preparation_time_minutes?: number;
    total_delay_minutes?: number;
    delivery?: {
        estimated_pickup_time: string;
        estimated_delivery_time: string;
    };
}

function parseIsoToMs(input: string): number {
    // Try native parse first
    let t = Date.parse(input);
    if (!Number.isNaN(t)) return t;
    // Trim microseconds to milliseconds and ensure Z suffix
    const trimmed = input.replace(/(\.\d{3})\d+/, "$1");
    const withZ = /Z$/.test(trimmed) ? trimmed : trimmed + "Z";
    t = Date.parse(withZ);
    return Number.isNaN(t) ? Date.now() : t;
}

function OrderCard({ order, acceptDeclineActions, prepActions, timerFromCreated, showDeliveryCountdown, onAccept, onDecline, onDelay, onDone, onCancel }: { order: ApiOrder; acceptDeclineActions?: boolean; prepActions?: boolean; timerFromCreated?: boolean; showDeliveryCountdown?: boolean; onAccept?: (id: number) => void; onDecline?: (id: number) => void; onDelay?: (id: number) => void; onDone?: (id: number) => void; onCancel?: (id: number) => void; }) {
    const total = order.items.reduce((sum, it) => sum + it.unit_price_NOK * it.quantity, 0);
    const [elapsed, setElapsed] = useState<number>(0); // minutes
    const [pickupInMin, setPickupInMin] = useState<number | null>(null);
    const [deliveryInMin, setDeliveryInMin] = useState<number | null>(null);

    useEffect(() => {
        const base = timerFromCreated ? order.created_at : order.accepted_at;
        if (!base) return;
        let start = parseIsoToMs(base);
        const now = Date.now();
        if (start > now) {
            start = now; // avoid freezing at 00:00 when server time is ahead of client
        }
        const tick = () => {
            const minutes = Math.floor((Date.now() - start) / 1000 / 60);
            setElapsed(minutes);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [order.accepted_at, order.created_at, timerFromCreated]);

    useEffect(() => {
        if (!showDeliveryCountdown || !order.delivery) return;
        const tick = () => {
            const now = Date.now();
            const pickupMs = parseIsoToMs(order.delivery!.estimated_pickup_time) - now;
            const deliveryMs = parseIsoToMs(order.delivery!.estimated_delivery_time) - now;
            setPickupInMin(Math.max(0, Math.ceil(pickupMs / 1000 / 60)));
            setDeliveryInMin(Math.max(0, Math.ceil(deliveryMs / 1000 / 60)));
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [showDeliveryCountdown, order.delivery?.estimated_pickup_time, order.delivery?.estimated_delivery_time]);
    const deliveryExpired = order.delivery ? parseIsoToMs(order.delivery.estimated_delivery_time) <= Date.now() : false;
    if (deliveryExpired) return null;

    return (
        <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium">Order #{order.id}</h3>
                        {/* <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString()}</span> */}
                    </div>
                    <div className="mt-2 space-y-1">
                        {order.items.map((it) => (
                            <div key={`${order.id}-${it.product_id}`} className="text-sm text-muted-foreground flex justify-between">
                                <span>{it.product_name} × {it.quantity}</span>
                                <span>{it.unit_price_NOK * it.quantity} NOK</span>
                            </div>
                        ))}
                    </div>
                    
                    <div className="mt-2 flex justify-between text-sm font-semibold">
                        <span>Total</span>
                        <span>{total} NOK</span>
                    </div>
                    {(order.accepted_at && !timerFromCreated) && (
                        <div className="mt-2 text-xs text-muted-foreground">Has been preparing for {elapsed} min</div>
                    )}
                    {prepActions && <div className="mt-2 text-xs text-muted-foreground">
                        {
                            (() => {
                                const readyIn = Number(order.projected_preparation_time_minutes) + (order.total_delay_minutes ? order.total_delay_minutes : 0) - elapsed;
                                if (readyIn > 0) return "Should be ready in " + readyIn + " min";
                                else return "Should have been ready " + (-readyIn) + " min ago";
                            })()
                        }
                    </div>}
                    {showDeliveryCountdown && order.delivery && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            {pickupInMin !== null && pickupInMin > 0 && (
                                <div>Pickup in {pickupInMin} min</div>
                            )}
                            {pickupInMin !== null && pickupInMin === 0 && deliveryInMin !== null && deliveryInMin > 0 && (
                                <div>Delivery in {deliveryInMin} min</div>
                            )}
                        </div>
                    )}
                    {(timerFromCreated) && (
                        <div className="mt-2 text-xs text-muted-foreground">Order came in {elapsed} min ago</div>
                    )}
                    {acceptDeclineActions && (
                        <div className="mt-3 flex gap-2 w-full">
                            <Button size="sm" variant="outline" onClick={() => onDecline && onDecline(order.id)}>Decline</Button>
                            <Button size="sm" className="grow" variant="default" onClick={() => onAccept && onAccept(order.id)}>Accept</Button>
                        </div>
                    )}
                    {prepActions && (
                        <div className="mt-3 flex gap-2 w-full">
                            <Button size="sm" variant="secondary" onClick={() => onDelay && onDelay(order.id)}>Delay</Button>
                            <Button size="sm" variant="destructive" onClick={() => onCancel && confirm("Are you sure you want to cancel this order?") && onCancel(order.id)}>Cancel</Button>
                            <Button size="sm" className="grow" variant="default" onClick={() => onDone && onDone(order.id)}>Done</Button>
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
    const [noRestaurant, setNoRestaurant] = useState<boolean>(false);
    const [delayDialogOpen, setDelayDialogOpen] = useState(false);
    const [delayOrderId, setDelayOrderId] = useState<number | null>(null);
    const [delayMinutes, setDelayMinutes] = useState<string>("5");

    const fetchOrders = () => {
        setLoading(true);
        fetch("/api/orders/", { credentials: "include" })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((data) => {
                setNoRestaurant(false);
                setNewOrders(data.new_orders || []);
                setInProgressOrders(data.in_progress_orders || []);
                setAwaitingPickupOrders(data.awaiting_pickup_orders || []);
            })
            .catch((e) => {
                const err: any = e;
                if (err && typeof err.status === "number" && err.status === 404) {
                    setNoRestaurant(true);
                } else {
                    console.error("Failed to load orders", e);
                }
            })
            .finally(() => setLoading(false));
    };

    const openDelayDialog = (orderId: number) => {
        setDelayOrderId(orderId);
        setDelayMinutes("5");
        setDelayDialogOpen(true);
    };

    const confirmDelay = async () => {
        if (!delayOrderId) return;
        const minutes = parseInt(delayMinutes, 10);
        if (Number.isNaN(minutes) || minutes < 0) {
            alert("Please enter a valid number of minutes");
            return;
        }
        await createPrepStep(delayOrderId, "de", minutes);
        setDelayDialogOpen(false);
        setDelayOrderId(null);
    };

    useEffect(() => {
        fetchOrders();
        const onCreated = () => fetchOrders();
        const onCancelled = () => fetchOrders();
        const onRefresh = () => fetchOrders();
        window.addEventListener("order:created", onCreated as EventListener);
        window.addEventListener("order:cancelled", onCancelled as EventListener);
        window.addEventListener("orders:refresh", onRefresh as EventListener);
        return () => {
            window.removeEventListener("order:created", onCreated as EventListener);
            window.removeEventListener("order:cancelled", onCancelled as EventListener);
            window.removeEventListener("orders:refresh", onRefresh as EventListener);
        };
    }, []);

    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [acceptOrderId, setAcceptOrderId] = useState<number | null>(null);
    const [projectedMinutes, setProjectedMinutes] = useState<string>("10");

    const openAcceptDialog = (orderId: number) => {
        setAcceptOrderId(orderId);
        setProjectedMinutes("10");
        setAcceptDialogOpen(true);
    };

    const confirmAccept = async () => {
        if (!acceptOrderId) return;
        const minutes = parseInt(projectedMinutes, 10);
        if (Number.isNaN(minutes) || minutes < 0) {
            alert("Please enter a valid projected time (minutes)");
            return;
        }
        try {
            const res = await fetch("/api/preparation_accepted/", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken(),
                },
                body: JSON.stringify({ order_id: acceptOrderId, projected_preparation_time_minutes: minutes }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to accept order");
            }
            setAcceptDialogOpen(false);
            setAcceptOrderId(null);
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

    const createPrepStep = async (orderId: number, status: "de"|"d"|"c", delaytime_minutes: number = 0) => {
        try {
            const res = await fetch("/api/preparation_step/", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken(),
                },
                body: JSON.stringify({ order_id: orderId, status, delaytime_minutes }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create preparation step");
            }
            fetchOrders();
        } catch (e) {
            console.error(e);
            alert("Could not update preparation");
        }
    };

    useEffect(() => { document.title = "Kyte - Dashboard"; }, []);

    if (loading) {
        return <div className="p-6">Loading orders…</div>;
    }

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Orders</h2>
                {newOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders</p>
                ) : (
                    newOrders.map((o) => (
                        <OrderCard key={o.id} order={o} acceptDeclineActions timerFromCreated onAccept={openAcceptDialog} onDecline={declineOrder} />
                    ))
                )}
            </section>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">In progress</h2>
                {inProgressOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders in progress</p>
                ) : (
                    inProgressOrders.map((o) => (
                        <OrderCard
                            key={o.id}
                            order={o}
                            prepActions
                            onDelay={(id) => openDelayDialog(id)}
                            onDone={(id) => createPrepStep(id, "d")}
                            onCancel={(id) => createPrepStep(id, "c")}
                        />
                    ))
                )}
            </section>
            <AlertDialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Accept order</AlertDialogTitle>
                        <AlertDialogDescription>
                            Set a projected preparation time (minutes) for this order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <label className="text-sm font-medium">Projected time (minutes)</label>
                        <Input type="number" min="0" value={projectedMinutes} onChange={(e) => setProjectedMinutes(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmAccept}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={delayDialogOpen} onOpenChange={setDelayDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add delay</AlertDialogTitle>
                        <AlertDialogDescription>
                            Enter the number of minutes to delay this order.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <label className="text-sm font-medium">Minutes</label>
                        <Input type="number" min="0" value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)} />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelay}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <section className="space-y-3">
                <h2 className="text-lg font-semibold">Awaiting pickup</h2>
                {awaitingPickupOrders.filter(o => !o.delivery || parseIsoToMs(o.delivery.estimated_delivery_time) > Date.now()).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders awaiting pickup</p>
                ) : (
                    awaitingPickupOrders
                        .filter(o => !o.delivery || parseIsoToMs(o.delivery.estimated_delivery_time) > Date.now())
                        .map((o) => <OrderCard key={o.id} order={o} showDeliveryCountdown />)
                )}
            </section>
        </div>
    );
}