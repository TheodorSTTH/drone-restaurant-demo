import { Outlet } from "react-router-dom";
import Sidebar from "./sidebar";

export default function Layout() {
  return (
    <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1">
            <Outlet />
        </main>
    </div>
  );
}
