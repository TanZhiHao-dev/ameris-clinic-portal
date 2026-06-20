import { createFileRoute } from '@tanstack/react-router'
import { PatientDetail } from '../components/clinic/PatientDetail'

export const Route = createFileRoute('/dokter/pasien/$id')({ component: DoctorPatientDetail })

function DoctorPatientDetail() {
  const { id } = Route.useParams()
  return <PatientDetail id={id} basePath="/dokter" />
}
