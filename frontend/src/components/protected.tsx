import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function Protected({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const loc = useLocation();

  useEffect(() => {
    fetch("/api/me/", { credentials: "include" })
      .then(r => {
        console.log("Protected: /api/me status:", r.status, r.ok);
        return r.ok ? r.json() : Promise.reject(r);
      })
      .then((data) => {
        console.log("Protected: /api/me data:", data);
        setOk(true);
      })
      .catch((error) => {
        console.error("Protected: /api/me failed:", error);
        setOk(false);
      });
  }, []);

  if (ok === null) return <p>Loading…</p>;
  if (!ok) {
    console.log("Protected: Redirecting to login, current path:", loc.pathname);
    window.location.href = "/accounts/login/";
  }
  return <>{children}</>;
}
