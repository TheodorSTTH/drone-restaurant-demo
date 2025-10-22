import { useEffect } from "react";

export default function Home() {
    useEffect(() => { document.title = "Kyte - Homepage for drone delivery"; }, []);
    return <h1 className="bg-blue-200 font-black">Homepage</h1>;
}