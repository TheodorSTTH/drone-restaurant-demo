import { useEffect, useState } from "react";

export default function App() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch("/api/ping")
      .then(r => r.json())
      .then(data => setMsg(data.message))
      .catch(() => setMsg("Failed to reach backend"));
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>🍣 Drone Delivery Dashboard!</h1>
      <p>Status from backend: <strong>{msg}</strong></p>
      <hr />
      <p>React + TypeScript + Django + Postgres via Docker.</p>
    </div>
  );
}
