import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Bell } from "lucide-react"
import { useEffect, useState } from "react"

type NotificationItem = { id: number; message: string; created_at: string; read: boolean }

export default function NotificationsButton() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch("/api/notifications/", { credentials: "include" })
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || "Failed to load notifications")
        }
        const data = await r.json()
        if (!cancelled) setItems(data.notifications || [])
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load notifications")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open])

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Notifications
          <Bell className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 mr-2" align="start">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="px-3 py-2 text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">No notifications</div>
        ) : (
          <div className="max-h-80 overflow-auto">
            {items.map((n) => (
              <div key={n.id} className="px-3 py-2 border-b last:border-b-0">
                <div className="text-sm">{n.message}</div>
                <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
