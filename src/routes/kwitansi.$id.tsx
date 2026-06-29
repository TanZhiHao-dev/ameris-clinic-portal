import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'
import { getReceipt } from '../server/bookings'
import { Receipt } from '../components/app/Receipt'

export const Route = createFileRoute('/kwitansi/$id')({ component: KwitansiPage })

function KwitansiPage() {
  const { id } = Route.useParams()
  const { data, isPending, error } = useQuery({
    queryKey: ['receipt', id],
    queryFn: () => getReceipt({ data: { id } }),
    retry: false,
  })

  return (
    <div className="min-h-screen px-4 py-8" style={{ background: 'var(--color-shell)' }}>
      {/* Toolbar — hidden when printing */}
      <div className="mx-auto mb-5 flex max-w-md items-center justify-between print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="nav-link inline-flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft size={16} /> Kembali
        </button>
        {data?.payStatus === 'Lunas' && (
          <button type="button" onClick={() => window.print()} className="btn btn-gold px-4 py-2 text-sm">
            <Printer size={16} /> Cetak / Simpan PDF
          </button>
        )}
      </div>

      {isPending ? (
        <div className="mx-auto max-w-md py-20 text-center text-sm" style={{ color: 'var(--color-ink-muted)' }}>
          Memuat kwitansi…
        </div>
      ) : error || !data ? (
        <div className="card-soft mx-auto max-w-md p-10 text-center">
          <p className="text-lg font-bold">Kwitansi tidak tersedia</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Transaksi tidak ditemukan atau kamu tidak punya akses.
          </p>
        </div>
      ) : data.payStatus !== 'Lunas' ? (
        <div className="card-soft mx-auto max-w-md p-10 text-center">
          <p className="text-lg font-bold">Belum bisa diterbitkan</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-ink-muted)' }}>
            Kwitansi tersedia setelah pembayaran lunas. Status transaksi ini masih{' '}
            <span className="font-semibold">belum lunas</span>.
          </p>
        </div>
      ) : (
        <Receipt data={data} />
      )}
    </div>
  )
}
