import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export default function Home() {
    useEffect(() => { document.title = "Kyte - Homepage for drone delivery"; }, []);
    const [msg, setMsg] = useState("Loading...");

    async function testProtectedData() {
        try {
            const response = await fetch("/api/protected-data/");
            if (!response.ok) {
                throw new Error("Failed to fetch protected data");
            }
            const data = await response.json();
            console.log(data);
        } catch (error) {
            console.error("Error:", error);
        }
    }

    useEffect(() => {
        fetch("/api/ping/")
            .then(r => r.json())
            .then(data => setMsg(data.message))
            .catch(() => setMsg("Failed to reach backend"));
    }, []);

    async function logout() {
        // read CSRF cookie (if you already have a helper, reuse it)
        if (!confirm("Are you sure you want to log out?")) return;
        const m = document.cookie.match(/(^|;\s*)csrftoken=([^;]+)/);
        const csrftoken = m ? decodeURIComponent(m[2]) : "";
        await fetch("/accounts/logout/", {
          method: "POST",
          headers: { "X-CSRFToken": csrftoken },
          credentials: "include",
        });
        // then reload or route home
        window.location.href = "/";
    }

    return (
        <div className="flex-1">
            {/* <h1>Hello, World!</h1>
            <button className="btn">Click me</button> */}
            <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
            <p>Status from backend: <strong>{msg}</strong></p>
            <br />
            <Button className="btn" onClick={testProtectedData}>Test Protected Data</Button>
            <br />
            <br />
            <Button className="btn btn-error" onClick={logout}>Log out</Button>
            </div>
        </div>
    )
}