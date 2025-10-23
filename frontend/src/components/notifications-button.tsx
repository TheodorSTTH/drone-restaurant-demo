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
  const [hasUnread, setHasUnread] = useState(false)

  async function fetchNotifications() {
    try {
      const r = await fetch("/api/notifications/", { credentials: "include" })
      if (!r.ok) return
      const data = await r.json()
      const list: NotificationItem[] = data.notifications || []
      setItems(list)
      setHasUnread(list.some(n => !n.read))
    } catch {}
  }

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
        if (!cancelled) {
          setItems(data.notifications || [])
          setHasUnread((data.notifications || []).some((n: NotificationItem) => !n.read))
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load notifications")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [open])

  useEffect(() => {
    let timer = setInterval(() => { fetchNotifications() }, 1000)
    return () => clearInterval(timer)
  }, [])

  const markOne = async (id: number) => {
    try {
      const r = await fetch(`/api/notifications/mark-read/${id}/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": (document.cookie.match(/(^|;\s*)csrftoken=([^;]+)/)?.[2]) || "" },
      })
      if (!r.ok) throw new Error("Failed to mark as read")
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    } catch (e) {
      console.error(e)
    }
  }

  const markAll = async () => {
    try {
      const r = await fetch(`/api/notifications/mark-all-read/`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRFToken": (document.cookie.match(/(^|;\s*)csrftoken=([^;]+)/)?.[2]) || "" },
      })
      if (!r.ok) throw new Error("Failed to mark all as read")
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          Notifications
          <span className="relative inline-flex items-center ml-1">
            <Bell className="size-4" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" aria-hidden="true"></span>
            )}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 mr-2" align="start">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          {items.some(i => !i.read) && (
            <button onClick={markAll} className="text-xs text-primary hover:underline">Mark all as read</button>
          )}
        </div>
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
              <button key={n.id} onClick={() => !n.read && markOne(n.id)} className="w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-accent focus:bg-accent">
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />}
                  <div className="flex-1">
                    <div className={`text-sm ${n.read ? "text-muted-foreground" : ""}`}>{n.message}</div>
                    <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
