import { useEffect } from "react";

export default function Products() {
    useEffect(() => { document.title = "Kyte - Products"; }, []);

    return <h1>🍣 Products</h1>;
}