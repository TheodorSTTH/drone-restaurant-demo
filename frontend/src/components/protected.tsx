import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const loc = useLocation();

  useEffect(() => {
    fetch("/api/me", { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(() => setOk(true))
      .catch(() => setOk(false));
  }, []);

  if (ok === null) return <p>Loading…</p>;
  if (!ok) return <Navigate to={`/accounts/login/?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return children;
}
