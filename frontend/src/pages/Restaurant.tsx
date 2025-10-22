import { useEffect } from "react";

export default function Restaurant() {
    useEffect(() => { document.title = "Kyte - Restaurant"; }, []);

    return <h1>🍣 Restaurants</h1>;
}