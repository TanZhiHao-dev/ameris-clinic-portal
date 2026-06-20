import { createFileRoute } from '@tanstack/react-router'
import { ScheduleBoard } from '../components/clinic/ScheduleBoard'

export const Route = createFileRoute('/dokter/jadwal')({ component: () => <ScheduleBoard /> })
