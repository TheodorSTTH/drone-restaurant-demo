import { useEffect, useState } from "react";
import Sidebar from "./components/sidebar";

export default function App() {
  const [msg, setMsg] = useState("Loading...");

  useEffect(() => {
    fetch("/api/ping")
    .then(r => r.json())
    .then(data => setMsg(data.message))
    .catch(() => setMsg("Failed to reach backend"));
  }, []);

  async function testProtectedData() {
    try {
      const response = await fetch("/api/protected-data");
      if (!response.ok) {
        throw new Error("Failed to fetch protected data");
      }
      const data = await response.json();
      console.log(data);
    } catch (error) {
      console.error("Error:", error);
    }
  }
  
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
    <div className="flex">
      <Sidebar />
      <div className="bg-red-200 flex-1">
        {/* <h1>Hello, World!</h1>
        <button className="btn">Click me</button> */}
        <div style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
          <p>Status from backend: <strong>{msg}</strong></p>
          <button className="btn" onClick={testProtectedData}>Test Protected Data</button>
          <button className="btn btn-error" onClick={logout}>Log out</button>
        </div>
      </div>
    </div>
  )
}


// export default function App() {



  

//   return (
//   );
// }
