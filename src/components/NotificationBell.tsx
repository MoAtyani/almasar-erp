'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  AppNotification,
  NotificationType,
  getNotifications,
  markNotificationRead,
  markAllRead,
  markAllReadForSection
} from '@/lib/notifications'
import { getUserPermissions, SectionKey } from '@/lib/permissions'
import { useLanguage } from '@/context/LanguageContext'

interface NotificationBellProps {
  currentSection?: string
  profile: any
}

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'po_to_warehouse':
      return '📋'
    case 'warehouse_to_sales':
      return '🏭'
    case 'materials_available':
      return '✅'
    case 'materials_shortage':
      return '⚠️'
    case 'new_external_project':
      return '🌐'
    case 'project_shortage':
      return '⚠️'
    case 'shortage_arrived':
      return '📦'
    case 'new_manufacturing_order':
      return '⚙️'
    case 'dept_status_update':
      return '🔄'
    default:
      return '🔔'
  }
}

function formatTimeAgo(dateStr: string, isRtl: boolean): string {
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (isNaN(diffSec) || diffSec < 60) {
    return isRtl ? 'الآن' : 'Just now'
  }
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return isRtl ? `منذ ${diffMin} دقيقة` : `${diffMin}m ago`
  }
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) {
    return isRtl ? `منذ ${diffHour} ساعة` : `${diffHour}h ago`
  }
  const diffDay = Math.floor(diffHour / 24)
  return isRtl ? `منذ ${diffDay} يوم` : `${diffDay}d ago`
}

export default function NotificationBell({ currentSection, profile }: NotificationBellProps) {
  const { isRtl } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  const isAccessible = (n: AppNotification): boolean => {
    if (!profile) return true
    const perms = getUserPermissions(profile)
    if (!perms || perms.defaultAccess === 'full') return true

    const targets = [...(n.targetSections || [])]
    if (n.targetSection) targets.push(n.targetSection)
    if (targets.length === 0 || targets.includes('all')) return true

    return targets.some(target => {
      const key = target as SectionKey
      const level = perms.sections[key] ?? perms.defaultAccess
      return level !== 'hidden'
    })
  }

  const loadNotifications = () => {
    const all = getNotifications()
    const accessible = all.filter(isAccessible)
    setNotifications(accessible)
  }

  useEffect(() => {
    loadNotifications()

    const handleUpdate = () => {
      loadNotifications()
    }

    window.addEventListener('almasar_notification', handleUpdate)
    window.addEventListener('almasar_notification_update', handleUpdate)

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)

    return () => {
      window.removeEventListener('almasar_notification', handleUpdate)
      window.removeEventListener('almasar_notification_update', handleUpdate)
      clearInterval(interval)
    }
  }, [profile])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const unreadCount = notifications.filter(n => !n.read).length
  const recentNotifications = notifications.slice(0, 10)
  const unreadList = recentNotifications.filter(n => !n.read)
  const readList = recentNotifications.filter(n => n.read)

  const handleMarkAllRead = () => {
    if (currentSection) {
      markAllReadForSection(currentSection)
    } else {
      markAllRead()
    }
    loadNotifications()
  }

  const handleItemClick = (n: AppNotification) => {
    if (!n.read) {
      markNotificationRead(n.id)
      loadNotifications()
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'var(--bg-secondary, rgba(255, 255, 255, 0.05))',
          border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
          borderRadius: 8,
          padding: '7px 10px',
          cursor: 'pointer',
          color: 'var(--text-primary, #f1f5f9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        title={isRtl ? 'الإشعارات' : 'Notifications'}
        aria-label="Notifications"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: isRtl ? 'auto' : -4,
              left: isRtl ? -4 : 'auto',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: 11,
              fontWeight: 700,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg-primary, #0f172a)',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.5)'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: isRtl ? 'auto' : 0,
            left: isRtl ? 0 : 'auto',
            width: 360,
            maxWidth: '90vw',
            background: 'var(--bg-card, #1e293b)',
            border: '1px solid var(--border, rgba(255, 255, 255, 0.15))',
            borderRadius: 12,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            direction: isRtl ? 'rtl' : 'ltr'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-primary, rgba(15, 23, 42, 0.6))'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary, #f8fafc)' }}>
                {isRtl ? 'التنبيهات والإشعارات' : 'Notifications'}
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 10
                  }}
                >
                  {unreadCount} {isRtl ? 'جديد' : 'new'}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent, #38bdf8)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontWeight: 500,
                  padding: '2px 4px'
                }}
              >
                {isRtl ? 'تحديد الكل كمقروء' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div
            style={{
              maxHeight: 380,
              overflowY: 'auto',
              padding: '6px 0'
            }}
          >
            {recentNotifications.length === 0 ? (
              <div
                style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: 'var(--text-muted, #94a3b8)',
                  fontSize: 13
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>📭</div>
                {isRtl ? 'لا توجد إشعارات حالياً' : 'No notifications yet'}
              </div>
            ) : (
              <>
                {unreadList.length > 0 && (
                  <div>
                    <div
                      style={{
                        padding: '6px 14px',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        color: 'var(--text-muted, #94a3b8)'
                      }}
                    >
                      {isRtl ? 'غير مقروء' : 'Unread'}
                    </div>
                    {unreadList.map(item => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          cursor: 'pointer',
                          background: 'rgba(56, 189, 248, 0.08)',
                          borderLeft: isRtl ? 'none' : '3px solid var(--accent, #38bdf8)',
                          borderRight: isRtl ? '3px solid var(--accent, #38bdf8)' : 'none',
                          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>
                          {getNotificationIcon(item.type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--text-primary, #f1f5f9)',
                              marginBottom: 2
                            }}
                          >
                            {item.title || item.projectName || item.project_name || 'Notification'}
                          </div>
                          {item.message && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-secondary, #cbd5e1)',
                                marginBottom: 4,
                                lineHeight: 1.4,
                                wordBreak: 'break-word'
                              }}
                            >
                              {item.message}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted, #94a3b8)',
                              display: 'flex',
                              gap: 8
                            }}
                          >
                            <span>{formatTimeAgo(item.createdAt, isRtl)}</span>
                            {item.fromUser && <span>• {item.fromUser}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {readList.length > 0 && (
                  <div>
                    {unreadList.length > 0 && (
                      <div
                        style={{
                          padding: '8px 14px 4px',
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          color: 'var(--text-muted, #94a3b8)'
                        }}
                      >
                        {isRtl ? 'سابق' : 'Earlier'}
                      </div>
                    )}
                    {readList.map(item => (
                      <div
                        key={item.id}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          background: 'transparent',
                          borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
                          opacity: 0.75
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1, marginTop: 2 }}>
                          {getNotificationIcon(item.type)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: 'var(--text-primary, #f1f5f9)',
                              marginBottom: 2
                            }}
                          >
                            {item.title || item.projectName || item.project_name || 'Notification'}
                          </div>
                          {item.message && (
                            <div
                              style={{
                                fontSize: 12,
                                color: 'var(--text-muted, #94a3b8)',
                                marginBottom: 4,
                                lineHeight: 1.4,
                                wordBreak: 'break-word'
                              }}
                            >
                              {item.message}
                            </div>
                          )}
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-muted, #94a3b8)',
                              display: 'flex',
                              gap: 8
                            }}
                          >
                            <span>{formatTimeAgo(item.createdAt, isRtl)}</span>
                            {item.fromUser && <span>• {item.fromUser}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
