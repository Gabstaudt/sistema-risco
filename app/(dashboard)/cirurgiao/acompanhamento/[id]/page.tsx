'use client'
import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { saveSurgeryRecord, type SurgeryDraft } from '@/lib/surgery-records'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
const empty: SurgeryDraft = { procedureType: '', segment: '', status: 'planejada', notes: '', postoperativeNotes: '', postoperativeOutcome: 'em_acompanhamento' }
export default function SurgeryFollowupPage() {
  const { id } = useParams<{ id: string }>()
  const { user, hasPermission } = useAuth()
  const { getPatientById, updatePatient, addAuditLog } = useData()
  const patient = getPatientById(id)
  const [draft, setDraft] = useState<SurgeryDraft>(empty)
  const [editing, setEditing] = useState<string>()
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  if (!patient) return <p className="p-6">Paciente não encontrado.</p>
  const set = (key: keyof SurgeryDraft, value: string) => setDraft({ ...draft, [key]: value })
  function save(event: React.FormEvent) {
    event.preventDefault(); setError(''); setMessage('')
    if (!patient || !user || !hasPermission('record_surgery')) return
    try {
      const records = saveSurgeryRecord(patient, user, draft, editing)
      updatePatient(id, { surgeryRecords: records })
      addAuditLog({ patientId: id, action: editing ? 'cirurgia_atualizada' : 'cirurgia_registrada', details: `${draft.procedureType} | ${draft.status} | Pós-operatório: ${draft.postoperativeOutcome}` })
      setDraft(empty); setEditing(undefined); setMessage('Registro salvo.')
    } catch(error) { setError(error instanceof Error ? error.message : 'Não foi possível salvar.') }
  }
  return <>
    <Header breadcrumbs={[{label:'Cirurgia e pós-operatório', href:'/cirurgiao/acompanhamento'}, {label:patient.nomeCompleto}]} />
    <main className="w-full flex-1 space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Cirurgia e pós-operatório</h1><p className="text-muted-foreground">{patient.nomeCompleto} · {patient.prontuario}</p></div><Button asChild variant="outline"><Link href={`/paciente/${id}`}>Ver prontuário</Link></Button></div>
      <form onSubmit={save} className="space-y-5">
        <Card><CardHeader><CardTitle>{editing ? 'Editar registro' : 'Novo registro cirúrgico'}</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="procedure-type">Tipo de cirurgia *</Label><Input id="procedure-type" className="h-12" value={draft.procedureType} onChange={e=>set('procedureType',e.target.value)} required /></div>
          <div className="space-y-2"><Label htmlFor="surgery-segment">Segmento / especialidade</Label><Input id="surgery-segment" className="h-12" value={draft.segment} onChange={e=>set('segment',e.target.value)} placeholder="Ex.: cirurgia geral, ortopedia" /></div>
          <div className="space-y-2"><Label htmlFor="surgery-status">Situação</Label><select id="surgery-status" className="h-12 w-full rounded-md border bg-background px-3" value={draft.status} onChange={e=>set('status',e.target.value)}><option value="planejada">Planejada</option><option value="realizada">Realizada</option><option value="cancelada">Cancelada</option></select></div>
          {draft.status==='realizada' && <div className="space-y-2"><Label htmlFor="surgery-date">Data da cirurgia *</Label><Input id="surgery-date" className="h-12" type="date" required value={draft.performedAt || ''} onChange={e=>set('performedAt',e.target.value)} /></div>}
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="surgery-notes">Descrição e observações cirúrgicas</Label><Textarea id="surgery-notes" rows={4} value={draft.notes} onChange={e=>set('notes',e.target.value)} /></div>
        </CardContent></Card>
        {draft.status==='realizada' && <Card><CardHeader><CardTitle>Pós-operatório e seguimento</CardTitle></CardHeader><CardContent className="space-y-4">
          <div className="space-y-2"><Label htmlFor="postoperative-outcome">Desfecho / acompanhamento</Label><select id="postoperative-outcome" className="h-12 w-full rounded-md border bg-background px-3" value={draft.postoperativeOutcome} onChange={e=>set('postoperativeOutcome',e.target.value)}><option value="em_acompanhamento">Em acompanhamento</option><option value="alta">Alta</option><option value="retorno">Retorno agendado</option><option value="internacao">Em internação</option></select></div>
          <div className="space-y-2"><Label htmlFor="postoperative-notes">Evolução, intercorrências e orientações</Label><Textarea id="postoperative-notes" rows={5} value={draft.postoperativeNotes} onChange={e=>set('postoperativeNotes',e.target.value)} /></div>
        </CardContent></Card>}
        {error && <p role="alert" className="text-destructive">{error}</p>}{message && <p role="status">{message}</p>}
        <div className="flex flex-wrap gap-3"><Button className="h-12" type="submit">Salvar registro</Button>{editing && <Button type="button" variant="outline" className="h-12" onClick={()=>{setDraft(empty);setEditing(undefined)}}>Cancelar edição</Button>}</div>
      </form>
      <Card><CardHeader><CardTitle>Registros de cirurgia</CardTitle></CardHeader><CardContent className="divide-y">
        {!patient.surgeryRecords?.length && <p className="py-4 text-muted-foreground">Nenhuma cirurgia registrada.</p>}
        {[...(patient.surgeryRecords || [])].reverse().map(record=><div key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><p className="font-semibold">{record.procedureType}</p><p className="text-sm text-muted-foreground">{record.segment || 'Segmento não informado'} · {record.status} {record.performedAt ? `· ${new Date(`${record.performedAt}T12:00:00`).toLocaleDateString('pt-BR')}` : ''}</p><p className="whitespace-pre-wrap break-words text-sm">{record.postoperativeNotes}</p></div><Button variant="outline" className="h-11" onClick={()=>{setDraft(record);setEditing(record.id);setMessage('');window.scrollTo({top:0,behavior:'smooth'})}}>Editar / acompanhar</Button></div>)}
      </CardContent></Card>
    </main>
  </>
}
