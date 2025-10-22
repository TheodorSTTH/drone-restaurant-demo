import { LayoutDashboard, Package, Store, User } from "lucide-react";
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Products",
    url: "/products",
    icon: Package,
  },
  {
    title: "Restaurant",
    url: "/restaurant",
    icon: Store,
  },
]

export default function AppSidebar() {
  const location = useLocation();
  const [username, setUsername] = useState<string>('Me');
  
  useEffect(() => {
    fetch('/api/me/', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(data => {
        if (data.username) {
          setUsername(data.username);
        }
      })
      .catch(err => {
        console.error('Failed to fetch user info:', err);
      });
  }, []);
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center justify-center px-2 py-4">
          <img 
            src="/kyte-logo-dark.svg" 
            alt="Kyte Logo" 
            className="h-6 w-auto group-data-[collapsible=icon]:hidden"
          />
          <img 
            src="/icon.png" 
            alt="Kyte" 
            className="h-6-important w-6 hidden group-data-[collapsible=icon]:block"
          />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className={location.pathname === item.url ? "bg-primary!" : ""} isActive={location.pathname === item.url} >
                    <Link to={item.url} className={location.pathname === item.url ? "bg-primary!" : ""} >
                      <item.icon className={location.pathname === item.url ? "text-white" : ""} />
                      <span className={location.pathname === item.url ? "text-white" : ""}>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={location.pathname === "/me" ? "bg-primary!" : ""} isActive={location.pathname === "/me"}>
              <Link to="/me" className={location.pathname === "/me" ? "bg-primary!" : ""}>
                <User className={location.pathname === "/me" ? "text-white" : ""} />
                <span className={location.pathname === "/me" ? "text-white" : ""}>{username}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}