import { createFileRoute, redirect } from '@tanstack/react-router'

// The doctor console opens on the schedule.
export const Route = createFileRoute('/dokter/')({
  beforeLoad: () => {
    throw redirect({ to: '/dokter/jadwal' })
  },
})
