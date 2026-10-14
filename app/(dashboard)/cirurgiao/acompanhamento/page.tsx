'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
export default function FollowupList() {
 const {patients}=useData();const [search,setSearch]=useState('')
 return <><Header breadcrumbs={[{label:'Cirurgia e pós-operatório'}]} /><main className="w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Cirurgia e pós-operatório</h1><Input aria-label="Buscar paciente" className="h-12" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nome ou prontuário" /><ul className="divide-y rounded-lg border px-4">{patients.filter(p=>`${p.nomeCompleto} ${p.prontuario}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(p=><li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-medium">{p.nomeCompleto}</p><p className="text-sm text-muted-foreground">{p.prontuario} · {p.surgeryRecords?.length || 0} registro(s)</p></div><Button asChild variant="outline" className="h-11"><Link href={`/cirurgiao/acompanhamento/${p.id}`}>Abrir acompanhamento</Link></Button></li>)}</ul></main></>
}
