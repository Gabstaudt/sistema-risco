'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { summarizeSurgeries } from '@/lib/surgery-records'
import { users } from '@/lib/data/users'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
export default function SurgeryAuditPage() {
 const {patients}=useData();const [from,setFrom]=useState('');const [to,setTo]=useState('');const [type,setType]=useState('')
 const invalidRange=Boolean(from && to && from>to)
 const all=summarizeSurgeries(patients);const summary=summarizeSurgeries(patients,from,to,type)
 return <><Header breadcrumbs={[{label:'Auditoria de cirurgias'}]} /><main className="w-full min-w-0 flex-1 space-y-6 p-4 sm:p-6">
  <h1 className="text-2xl font-bold">Auditoria de cirurgias</h1><p className="text-muted-foreground">Quantidade e tipos de procedimentos realizados. Planejamentos e cancelamentos não entram na contagem.</p>
  <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="surgery-from">De</Label><Input id="surgery-from" className="h-12" type="date" value={from} onChange={e=>setFrom(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="surgery-to">Até</Label><Input id="surgery-to" className="h-12" type="date" value={to} onChange={e=>setTo(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="surgery-type-filter">Tipo de cirurgia</Label><select id="surgery-type-filter" className="h-12 w-full rounded-md border bg-background px-3" value={type} onChange={e=>setType(e.target.value)}><option value="">Todos os tipos</option>{all.byType.map(group=><option key={group.type} value={group.type}>{group.type}</option>)}</select></div></div>
  {invalidRange ? <p role="alert" className="text-destructive">A data inicial deve ser anterior ou igual à final.</p> : <>
   <div className="grid gap-4 sm:grid-cols-2"><Card><CardHeader><CardTitle>Cirurgias realizadas</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold" data-testid="surgery-total">{summary.total}</p></CardContent></Card><Card><CardHeader><CardTitle>Tipos de cirurgia</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{summary.byType.length}</p></CardContent></Card></div>
   <Card><CardHeader><CardTitle>Quantidade por tipo</CardTitle></CardHeader><CardContent><ul className="divide-y">{summary.byType.map(group=><li key={group.type} className="flex items-center justify-between gap-3 py-3"><span className="break-words">{group.type}</span><span className="font-semibold">{group.count}</span></li>)}</ul>{!summary.total && <p className="text-muted-foreground">Nenhuma cirurgia realizada no período selecionado.</p>}</CardContent></Card>
   <Card><CardHeader><CardTitle>Procedimentos realizados</CardTitle></CardHeader><CardContent className="divide-y">{summary.rows.map(({patientId,patientName,record})=><div key={`${patientId}-${record.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="break-words font-semibold">{record.procedureType}</p><p>{patientName}</p><p className="text-sm text-muted-foreground">{new Date(`${record.performedAt}T12:00:00`).toLocaleDateString('pt-BR')} · {record.segment || 'Segmento não informado'} · Registrado por {users.find(user=>user.id===record.createdBy)?.name || record.createdBy}</p></div><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patientId}`}>Ver prontuário</Link></Button></div>)}</CardContent></Card>
  </>}
 </main></>
}
