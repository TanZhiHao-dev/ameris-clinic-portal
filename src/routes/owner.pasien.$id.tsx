import { createFileRoute } from '@tanstack/react-router'
import { PatientDetail } from '../components/clinic/PatientDetail'

export const Route = createFileRoute('/owner/pasien/$id')({ component: PatientDetailRoute })

function PatientDetailRoute() {
  const { id } = Route.useParams()
  return <PatientDetail id={id} basePath="/owner" />
}
