import { useEffect, useState } from "react";

export default function Dashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [inProgressOrders, setInProgressOrders] = useState<any[]>([]);
    const [awaitingPickupOrders, setAwaitingPickupOrders] = useState<any[]>([]);

    useEffect(() => {
        // Fetch orders from the API
        // Fetch in progress orders from the API
        // Fetch awaiting pickup orders from the API
    }, [])

    useEffect(() => { document.title = "Kyte Drone Delivery Dashboard"; }, []);

    return <h1 className="bg-base font-black">🍣 Dashboard!!</h1>;
}