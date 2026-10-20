'use client'
import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
export default function MedicalDocumentsPage() {
 const { id } = useParams<{ id: string }>()
 const { user, hasPermission } = useAuth()
 const { getPatientById, medicalDocuments, createMedicalDocument, isDataReady } = useData()
 const patient = getPatientById(id)
 const [kind, setKind] = useState<'receita' | 'atestado'>('receita')
 const [content, setContent] = useState('')
 const [registration, setRegistration] = useState(user?.professionalRegistration || '')
 const [startDate, setStartDate] = useState('')
 const [endDate, setEndDate] = useState('')
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)
 const saving = useRef(false)
 const allowed = hasPermission(kind === 'receita' ? 'issue_prescription' : 'issue_certificate')
 async function submit() {
  if (saving.current) return
  saving.current = true; setBusy(true); setError('')
  try { await createMedicalDocument(id, { kind, content, professionalRegistration: registration, startDate: kind === 'atestado' ? startDate : undefined, endDate: kind === 'atestado' ? endDate : undefined }); setContent('') } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível emitir o documento.') } finally { saving.current = false; setBusy(false) }
 }
 if (!isDataReady) return <p className="p-6">Carregando...</p>
 if (!patient) return <p className="p-6">Paciente não encontrado ou não direcionado para este profissional.</p>
 return <><Header breadcrumbs={[{ label: 'Paciente', href: `/paciente/${id}` }, { label: 'Receitas e atestados' }]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
  <h1 className="text-2xl font-bold">Receitas e atestados</h1><p className="font-medium">{patient.nomeCompleto} · {patient.prontuario}</p>
  <Card><CardHeader><CardTitle>Emitir documento</CardTitle></CardHeader><CardContent className="space-y-4">
   <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="document-kind">Documento</Label><select id="document-kind" className="h-12 w-full rounded-md border bg-background px-3" value={kind} onChange={event => setKind(event.target.value as typeof kind)}><option value="receita">Receita</option><option value="atestado">Atestado</option></select></div><div className="space-y-2"><Label htmlFor="document-registration">CRM / UF *</Label><Input id="document-registration" className="h-12" value={registration} onChange={event => setRegistration(event.target.value)} /></div></div>
   {kind === 'atestado' && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="document-start">Início *</Label><Input id="document-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="document-end">Fim *</Label><Input id="document-end" type="date" min={startDate} value={endDate} onChange={event => setEndDate(event.target.value)} /></div></div>}
   <div className="space-y-2"><Label htmlFor="document-content">{kind === 'receita' ? 'Medicamentos, posologia, duração e orientações *' : 'Texto do atestado *'}</Label><Textarea id="document-content" rows={9} value={content} onChange={event => setContent(event.target.value)} /></div>
   {error && <p role="alert" className="text-destructive">{error}</p>}<Button className="h-12" onClick={submit} disabled={busy || !allowed || !content.trim() || !registration.trim()}>Emitir {kind}</Button>
  </CardContent></Card>
  <Card><CardHeader><CardTitle>Documentos emitidos</CardTitle></CardHeader><CardContent><ul className="divide-y">{medicalDocuments.filter(document => document.patientId === id&&['receita','atestado'].includes(document.kind)).sort((a,b) => Date.parse(b.issuedAt)-Date.parse(a.issuedAt)).map(document => <li key={document.id} className="space-y-3 py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{document.kind === 'receita' ? 'Receita' : 'Atestado'} · {new Date(document.issuedAt).toLocaleString('pt-BR')}</p><p className="text-sm text-muted-foreground">{document.physicianName} · {document.professionalRegistration}</p></div><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${id}/imprimir?tipo=${document.kind}&documento=${document.id}`} target="_blank">Imprimir {document.kind}</Link></Button></div><p className="whitespace-pre-wrap break-words text-sm">{document.content}</p></li>)}</ul>{!medicalDocuments.some(document => document.patientId === id&&['receita','atestado'].includes(document.kind)) && <p className="py-4 text-muted-foreground">Nenhum documento emitido.</p>}</CardContent></Card>
 </main></>
}
