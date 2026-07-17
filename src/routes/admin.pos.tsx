import { createFileRoute } from '@tanstack/react-router'
import { PosScreen } from '#/components/clinic/PosScreen'

export const Route = createFileRoute('/admin/pos')({ component: PosScreen })
