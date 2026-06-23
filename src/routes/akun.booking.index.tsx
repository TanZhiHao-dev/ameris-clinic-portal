import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, Ticket } from 'lucide-react'
import { formatDateId, statusTone, type BookingStatus } from '../data/account'
import { formatRp } from '../data/clinic'
import { listMyBookings } from '../server/bookings'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/i18n-dict'

export const Route = createFileRoute('/akun/booking/')({ component: MyBookings })

const TABS = ['Semua', 'Mendatang', 'Selesai'] as const
const TAB_LABEL: Record<(typeof TABS)[number], DictKey> = {
  Semua: 'mb.tabAll',
  Mendatang: 'mb.tabUpcoming',
  Selesai: 'mb.tabDone',
}

function MyBookings() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Semua')
  // Aliased to `tr` — the tab map variable below is named `t`.
  const { t: tr } = useI18n()

  const { data: list = [] } = useQuery({
    queryKey: ['my-bookings', tab],
    queryFn: () => listMyBookings({ data: { tab } }),
  })

  return (
    <div>
      <h1 className="text-[2rem]">{tr('mb.title')}</h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
        {tr('mb.sub')}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tabKey) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => setTab(tabKey)}
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={
              tab === tabKey
                ? { background: 'var(--color-ink)', color: 'var(--color-cream)' }
                : { background: 'var(--color-shell)', color: 'var(--color-ink-muted)', border: '1px solid var(--color-line)' }
            }
          >
            {tr(TAB_LABEL[tabKey])}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card-soft mt-6 p-10 text-center">
          <p className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>{tr('mb.empty')}</p>
          <Link to="/treatment" className="btn btn-gold mt-5">{tr('common.bookNow')}</Link>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {list.map((a) => (
            <div key={a.id} className="card-soft p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-bold">
                    <CalendarDays size={17} style={{ color: 'var(--color-gold-deep)' }} />
                    {formatDateId(a.date)}
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                    <span className="inline-flex items-center gap-1"><Clock size={13} /> {a.time} WIB</span>
                    <span>No. {a.id}</span>
                  </div>
                </div>
                <span className="badge" style={{ background: statusTone[a.status as BookingStatus].bg, color: statusTone[a.status as BookingStatus].color }}>
                  {tr(`status.${a.status}` as DictKey)}
                </span>
              </div>

              <div className="my-4 hairline-gold" />

              {a.items.map((it) => (
                <div key={it.name} className="flex justify-between text-sm">
                  <span className="pr-2">{it.name}</span>
                  <span className="mono shrink-0">{formatRp(it.price)}</span>
                </div>
              ))}

              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-ink-muted)' }}>
                  {a.payment === 'Online' ? tr('mb.payOnline') : tr('mb.payClinic')}
                </span>
                <span className="mono text-lg font-extrabold gold-text">{formatRp(a.total)}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/akun/booking/$id" params={{ id: a.id }} className="btn btn-primary px-4 py-2 text-sm">
                  <Ticket size={16} /> {tr('ov.ticket')}
                </Link>
                {(a.status === 'Menunggu' || a.status === 'Dikonfirmasi') && (
                  <>
                    <button type="button" className="btn btn-ghost px-4 py-2 text-sm">{tr('mb.reschedule')}</button>
                    <button type="button" className="btn btn-ghost px-4 py-2 text-sm" style={{ color: 'var(--color-rose)' }}>{tr('mb.cancel')}</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
