'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
export default function Page() {
 const {patients} = useData();const [search,setSearch] = useState('')
 const filtered = patients.filter(patient=>`${patient.nomeCompleto} ${patient.prontuario} ${patient.cpf}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
 return <><Header breadcrumbs={[{label:'Pacientes do laboratório'}]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Pacientes</h1><Input className="h-12" aria-label="Pesquisar pacientes" placeholder="Nome, prontuário ou CPF" value={search} onChange={event=>setSearch(event.target.value)} /><Card><CardHeader><CardTitle>Pacientes · {filtered.length}</CardTitle></CardHeader><CardContent><ul className="divide-y">{filtered.map(patient=><li key={patient.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{patient.nomeCompleto}</p><p className="text-sm text-muted-foreground">{patient.prontuario} · {patient.idade} anos</p></div><div className="flex flex-wrap gap-2"><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patient.id}`}>Consultar paciente</Link></Button><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patient.id}/exames`}>Exames</Link></Button><Button asChild className="h-11"><Link href={`/paciente/${patient.id}/medicacoes`}>Ficha de medicação</Link></Button></div></li>)}{!filtered.length&&<li className="py-6 text-muted-foreground">Nenhum paciente encontrado.</li>}</ul></CardContent></Card></main></>
}
