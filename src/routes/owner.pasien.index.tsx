import { createFileRoute } from '@tanstack/react-router'
import { PatientsTable } from '../components/clinic/PatientsTable'

export const Route = createFileRoute('/owner/pasien/')({ component: () => <PatientsTable basePath="/owner" /> })
