import { useEffect } from "react";

export default function NotFound() {
    useEffect(() => { document.title = "Kyte - Page Not Found"; }, []);

    return <h1>404 - Page Not Found</h1>;
}