import { useEffect } from "react";

export default function Dashboard() {
    useEffect(() => { document.title = "Kyte Drone Delivery Dashboard"; }, []);
    return <h1 className="bg-base font-black">🍣 Dashboard!!</h1>;
}