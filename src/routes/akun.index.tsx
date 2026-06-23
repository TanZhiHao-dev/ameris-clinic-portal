import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  Bell,
  Cake,
  CalendarDays,
  Crown,
  Sparkles,
  Tag,
  Ticket,
} from 'lucide-react'
import {
  birthdayLabel,
  daysUntilBirthday,
  formatDateId,
  statusTone,
  type BookingStatus,
  type NotifType,
} from '../data/account'
import { formatRp } from '../data/clinic'
import { authClient } from '../lib/auth-client'
import { listMyBookings, upcomingMyBooking } from '../server/bookings'
import { listPromos } from '../server/treatments'
import { loyaltySummary } from '../server/loyalty'
import { myNotifications } from '../server/account'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/akun/')({ component: Overview })

function MiniRing({ value, target }: { value: number; target: number }) {
  const r = 34
  const c = 2 * Math.PI * r
  const off = c * (1 - Math.min(value / target, 1))
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
      <defs>
        <linearGradient id="mini-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#efdca6" />
          <stop offset="100%" stopColor="#c8a14a" />
        </linearGradient>
      </defs>
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(246,237,220,0.14)" strokeWidth="8" />
      <circle cx="42" cy="42" r={r} fill="none" stroke="url(#mini-gold)" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} />
    </svg>
  )
}

const NOTIF_ICON: Record<NotifType, typeof Bell> = {
  reminder: Bell,
  promo: Tag,
  point: Crown,
  birthday: Cake,
}

function Overview() {
  const { t } = useI18n()
  const { data: session } = authClient.useSession()
  const user = session?.user

  const { data: upcoming = null } = useQuery({
    queryKey: ['upcoming-booking'],
    queryFn: () => upcomingMyBooking(),
  })
  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings', 'Semua'],
    queryFn: () => listMyBookings({ data: {} }),
  })
  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => myNotifications(),
  })
  const { data: summary } = useQuery({
    queryKey: ['loyalty-summary'],
    queryFn: () => loyaltySummary(),
  })
  const { data: promos = [] } = useQuery({
    queryKey: ['promos'],
    queryFn: () => listPromos(),
  })

  const done = bookings.filter((a) => a.status === 'Selesai').length
  const active = bookings.filter((a) => a.status !== 'Selesai' && a.status !== 'Batal').length

  const points = summary?.points ?? user?.loyaltyPoints ?? 0
  const nextTier = summary?.nextTier ?? null
  const promo = promos[0]

  const notifications = notif?.items ?? []
  const unreadCount = notif?.unreadCount ?? 0

  const userName = user?.name ?? '—'

  // Birthday countdown — client-side to avoid SSR/clock mismatch.
  const [bday, setBday] = useState<{ days: number; isToday: boolean } | null>(null)
  useEffect(() => {
    if (!user?.birthDate) return
    const days = daysUntilBirthday(user.birthDate, new Date())
    setBday({ days, isToday: days === 0 })
  }, [user?.birthDate])

  return (
    <div>
      <h1 className="text-[2rem]">
        {t('ov.hi')} <span className="gold-text italic">{userName.split(' ')[0]}</span> ✦
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        {t('ov.welcome')}
      </p>

      {/* Birthday promo (PRD: Promo Ulang Tahun) */}
      {bday && bday.days <= 35 && (
        <div
          className="mt-6 flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl p-6 sm:flex-row sm:items-center"
          style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}
        >
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full" style={{ background: 'var(--grad-gold)', color: '#3a2c0f' }}>
              <Cake size={22} />
            </div>
            <div>
              <div className="font-bold" style={{ color: '#faf3e6' }}>
                {bday.isToday ? t('ov.bdayToday') : t('ov.bdaySoon', { days: bday.days })}
              </div>
              <div className="text-sm" style={{ color: 'rgba(246,237,220,0.72)' }}>
                {t('ov.bdayBody', { date: user?.birthDate ? birthdayLabel(user.birthDate) : '' })}
              </div>
            </div>
          </div>
          <Link to="/treatment" className="btn btn-gold shrink-0">
            {t('ov.bdayClaim')}
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="card-soft flex items-center gap-4 p-5" style={{ background: 'var(--color-espresso)', color: '#f6eddc' }}>
          <div className="relative grid shrink-0 place-items-center">
            <MiniRing value={points} target={nextTier?.point ?? 20} />
            <span className="mono absolute text-xl font-extrabold" style={{ color: '#faf3e6' }}>{points}</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-gold-light)' }}>
              <Crown size={13} /> {t('ov.points')}
            </div>
            <Link to="/akun/privilege" className="mt-1 inline-flex items-center gap-1 text-[0.82rem] font-semibold" style={{ color: 'var(--color-gold-light)' }}>
              {t('ov.redeem')} <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="card-soft p-5">
          <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>{t('ov.activeBookings')}</div>
          <div className="mono mt-2 text-4xl font-extrabold gold-text">{active}</div>
          <Link to="/akun/booking" className="mt-2 inline-flex items-center gap-1 text-[0.8rem] font-semibold" style={{ color: 'var(--color-gold-deep)' }}>
            {t('ov.viewAll')} <ArrowRight size={13} />
          </Link>
        </div>

        <div className="card-soft p-5">
          <div className="text-[0.72rem] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-muted)' }}>{t('ov.doneTreatments')}</div>
          <div className="mono mt-2 text-4xl font-extrabold gold-text">{done}</div>
          <div className="mt-2 text-[0.8rem]" style={{ color: 'var(--color-ink-muted)' }}>{t('ov.totalVisits')}</div>
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Upcoming appointment */}
        <div>
          <h2 className="text-xl">{t('ov.upcoming')}</h2>
          {upcoming ? (
            <div className="card-soft mt-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <CalendarDays size={18} style={{ color: 'var(--color-gold-deep)' }} />
                    {formatDateId(upcoming.date)}
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                    {t('ov.atTime', { time: upcoming.time, id: upcoming.id })}
                  </div>
                </div>
                <span className="badge" style={{ background: statusTone[upcoming.status as BookingStatus].bg, color: statusTone[upcoming.status as BookingStatus].color }}>
                  {t(`status.${upcoming.status}` as DictKey)}
                </span>
              </div>
              <div className="my-4 hairline-gold" />
              {upcoming.items.map((it) => (
                <div key={it.name} className="flex justify-between text-sm">
                  <span>{it.name}</span>
                  <span className="mono">{formatRp(it.price)}</span>
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between">
                <span className="mono text-lg font-extrabold gold-text">{formatRp(upcoming.total)}</span>
                <Link to="/akun/booking/$id" params={{ id: upcoming.id }} className="btn btn-primary px-4 py-2 text-sm">
                  <Ticket size={16} /> {t('ov.ticket')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="card-soft mt-4 p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{t('ov.noUpcoming')}</p>
              <Link to="/treatment" className="btn btn-gold mt-5">{t('common.bookNow')}</Link>
            </div>
          )}

          {/* Weekly promo shortcut (PRD: Promo Keliling) */}
          {promo && (
            <div className="card-soft mt-6 flex items-center gap-4 p-5" style={{ background: 'var(--color-blush-soft)' }}>
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(195,154,68,0.16)', color: 'var(--color-gold-deep)' }}>
                <Tag size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold leading-tight">{t('ov.promoPrefix', { name: promo.name })}</div>
                <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                  <span className="mono font-semibold gold-text">{formatRp(promo.now)}</span>{' '}
                  <span className="mono line-through">{formatRp(promo.was)}</span>
                </div>
              </div>
              <Link to="/treatment" className="btn btn-ghost shrink-0 px-4 py-2 text-sm">{t('ov.take')}</Link>
            </div>
          )}
        </div>

        {/* Notifications (PRD: Sistem Notifikasi / Push) */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl">{t('ov.notifications')}</h2>
            <span className="badge badge-promo">{t('ov.newCount', { count: unreadCount })}</span>
          </div>
          <div className="card-soft mt-4 divide-y" style={{ borderColor: 'var(--color-line)' }}>
            {notifications.map((n) => {
              const Icon = NOTIF_ICON[n.type as NotifType] ?? Bell
              return (
                <div key={n.id} className="flex gap-3 p-4" style={{ background: n.unread ? 'rgba(195,154,68,0.05)' : undefined }}>
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'var(--color-muted)', color: 'var(--color-gold-deep)' }}>
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{n.title}</span>
                      {n.unread && <span className="glow-dot" style={{ width: '0.4rem', height: '0.4rem' }} aria-hidden />}
                    </div>
                    <p className="mt-0.5 text-[0.82rem] leading-snug" style={{ color: 'var(--color-ink-muted)' }}>{n.body}</p>
                    <div className="mt-1 text-[0.72rem]" style={{ color: 'var(--color-ink-muted)' }}>{n.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Quick action */}
      <div className="card-soft mt-6 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Sparkles size={22} style={{ color: 'var(--color-gold-deep)' }} />
          <div>
            <div className="font-bold">{t('ov.glowTitle')}</div>
            <div className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{t('ov.glowBody')}</div>
          </div>
        </div>
        <Link to="/treatment" className="btn btn-gold shrink-0">
          {t('ov.bookTreatment')} <ArrowRight size={17} />
        </Link>
      </div>
    </div>
  )
}
