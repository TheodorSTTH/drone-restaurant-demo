import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface UserData {
    id: number;
    username: string;
    email: string;
    restaurant_id: number | null;
    restaurant_name: string | null;
    is_admin: boolean;
}

export default function Me() {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { 
        document.title = "Kyte - Me"; 
        
        // Fetch user data
        fetch('/api/me/', { credentials: 'include' })
            .then(r => r.ok ? r.json() : Promise.reject(r))
            .then(data => {
                setUserData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch user info:', err);
                setLoading(false);
            });
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

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    return <div className="p-6 space-y-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        
        {userData && (
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-gray-500">Username</label>
                    <p className="text-lg">{userData.username}</p>
                </div>
                
                <div>
                    <label className="text-sm font-medium text-gray-500">Admin</label>
                    <p className="text-lg">{userData.is_admin ? 'Yes' : 'No'}</p>
                </div>
                
                {userData.restaurant_name ? (
                    <div>
                        <label className="text-sm font-medium text-gray-500">Restaurant</label>
                        <p className="text-lg">{userData.restaurant_name}</p>
                    </div>
                ) : (
                    <div>
                        <label className="text-sm font-medium text-gray-500">Restaurant</label>
                        <p className="text-lg">No restaurant linked</p>
                    </div>
                )}
            </div>
        )}
        
        <div className="pt-4">
            <Button variant={'destructive'} onClick={logout}>Log out</Button>
        </div>
    </div>;
}