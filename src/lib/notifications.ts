export type NotificationType =
  | 'new_external_project'
  | 'project_shortage'
  | 'shortage_arrived'
  | 'new_manufacturing_order'
  | 'dept_status_update'
  | 'materials_available'
  | 'materials_shortage'
  | 'po_to_warehouse'
  | 'warehouse_to_sales'

export interface AppNotification {
  id: string
  type: NotificationType
  title?: string
  message?: string
  targetSections: string[]
  targetSection?: string // legacy single
  fromUser?: string
  projectRef?: string
  projectName?: string
  department?: string
  material_name?: string
  quantity?: number
  project_name?: string
  reference?: string
  status?: 'pending' | 'read' | 'arrived' | 'resolved' | 'available' | 'partial' | string
  createdAt: string
  read: boolean
}

const STORAGE_KEY = 'almasar_notifications'

export function getNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): AppNotification {
  const full: AppNotification = {
    ...notif,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    read: false
  }
  const existing = getNotifications()
  existing.unshift(full)
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 200)))
      // Dispatch custom event so other components can react
      window.dispatchEvent(new CustomEvent('almasar_notification', { detail: full }))
      window.dispatchEvent(new CustomEvent('almasar_notification_update'))
    } catch (e) {
      console.error('Failed to save notification', e)
    }
  }
  return full
}

export function getNotificationsForSection(section: string): AppNotification[] {
  return getNotifications().filter(n =>
    n.targetSections?.includes(section) || n.targetSection === section
  )
}

export function getUnreadCountForSection(section: string): number {
  return getNotificationsForSection(section).filter(n => !n.read).length
}

export function markNotificationRead(id: string): void {
  const all = getNotifications()
  const updated = all.map(n => (n.id === id ? { ...n, read: true } : n))
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('almasar_notification_update'))
    } catch (e) {
      console.error('Failed to update notification', e)
    }
  }
}

export function markAllReadForSection(section: string): void {
  const all = getNotifications()
  const updated = all.map(n =>
    (n.targetSections?.includes(section) || n.targetSection === section) ? { ...n, read: true } : n
  )
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('almasar_notification_update'))
    } catch (e) {
      console.error('Failed to update notifications', e)
    }
  }
}

export function markAllRead(): void {
  const all = getNotifications()
  const updated = all.map(n => ({ ...n, read: true }))
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('almasar_notification_update'))
    } catch (e) {
      console.error('Failed to update notifications', e)
    }
  }
}

export function resolveShortage(notifId: string): void {
  const all = getNotifications()
  const updated = all.map(n => (n.id === notifId ? { ...n, status: 'arrived' as const, read: true } : n))
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('almasar_notification_update'))
    } catch (e) {
      console.error('Failed to resolve shortage', e)
    }
  }
}
