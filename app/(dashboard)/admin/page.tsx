import { Suspense } from 'react'
import { AdminOverview } from '@/components/shared/admin-overview'
export default function Page(){return <Suspense fallback={<p className="p-6">Carregando...</p>}><AdminOverview/></Suspense>}
