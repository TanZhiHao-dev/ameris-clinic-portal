import { createFileRoute } from '@tanstack/react-router'
import { InventoryManager } from '#/components/clinic/InventoryManager'

export const Route = createFileRoute('/admin/')({ component: InventoryManager })
