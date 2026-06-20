import { createFileRoute } from '@tanstack/react-router'
import { PatientsTable } from '../components/clinic/PatientsTable'

export const Route = createFileRoute('/dokter/pasien/')({ component: () => <PatientsTable basePath="/dokter" /> })
