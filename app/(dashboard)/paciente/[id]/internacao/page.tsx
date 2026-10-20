'use client'
import {useState,useRef} from 'react'
import {useParams} from 'next/navigation'
import Link from 'next/link'
import {useAuth} from '@/lib/auth'
import {useData} from '@/lib/data-context'
import {ADMISSION_DOCUMENTS} from '@/lib/admission-documents'
import {Header} from '@/components/layout/header'
import {Card,CardHeader,CardTitle,CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Label} from '@/components/ui/label'
import {Input} from '@/components/ui/input'
import {Textarea} from '@/components/ui/textarea'
export default function Page(){
 const {id}=useParams<{id:string}>();const {user,hasPermission}=useAuth();const {getPatientById,isDataReady,medicalDocuments,createMedicalDocument}=useData();const patient=getPatientById(id);const [kind,setKind]=useState<keyof typeof ADMISSION_DOCUMENTS>('autorizacao');const [content,setContent]=useState('');const [registration,setRegistration]=useState(user?.professionalRegistration||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false)
 async function save(event:React.FormEvent){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await createMedicalDocument(id,{kind,content,professionalRegistration:registration});setContent('')}catch(error){setError(error instanceof Error?error.message:'Não foi possível emitir.')}finally{lock.current=false;setBusy(false)}}
 if(!isDataReady)return <p className="p-6">Carregando...</p>
 if(!patient||!hasPermission('issue_admission_documents'))return <p className="p-6">Paciente ou fichas indisponíveis para este profissional.</p>
 const documents=medicalDocuments.filter(doc=>doc.patientId===id&&Object.hasOwn(ADMISSION_DOCUMENTS,doc.kind)).sort((a,b)=>Date.parse(b.issuedAt)-Date.parse(a.issuedAt))
 return <><Header breadcrumbs={[{label:'Paciente',href:`/paciente/${id}`},{label:'Fichas de internação'}]}/><main className="w-full min-w-0 space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Fichas de internação</h1><p className="font-medium">{patient.nomeCompleto} · {patient.prontuario}</p><Card><CardHeader><CardTitle>Emitir ficha</CardTitle></CardHeader><CardContent><form onSubmit={save} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="admission-kind">Tipo de ficha</Label><select id="admission-kind" className="h-12 w-full rounded-md border bg-background px-3" value={kind} onChange={event=>setKind(event.target.value as typeof kind)}>{Object.entries(ADMISSION_DOCUMENTS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="space-y-2"><Label htmlFor="admission-crm">CRM / UF *</Label><Input id="admission-crm" className="h-12" required value={registration} onChange={event=>setRegistration(event.target.value)}/></div></div><div className="space-y-2"><Label htmlFor="admission-content">{ADMISSION_DOCUMENTS[kind]} · conteúdo *</Label><Textarea id="admission-content" rows={10} required value={content} onChange={event=>setContent(event.target.value)}/></div>{error&&<p role="alert" className="text-destructive">{error}</p>}<Button className="h-12" disabled={busy}>Salvar ficha</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Fichas registradas</CardTitle></CardHeader><CardContent><ul className="divide-y">{documents.map(doc=><li key={doc.id} className="space-y-3 py-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{ADMISSION_DOCUMENTS[doc.kind as keyof typeof ADMISSION_DOCUMENTS]}</p><p className="text-sm text-muted-foreground">{new Date(doc.issuedAt).toLocaleString('pt-BR')} · {doc.physicianName}</p></div><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${id}/imprimir?tipo=${doc.kind}&documento=${doc.id}`} target="_blank">Imprimir ficha</Link></Button></div><details><summary className="cursor-pointer">Abrir conteúdo</summary><p className="mt-3 whitespace-pre-wrap break-words">{doc.content}</p></details></li>)}{!documents.length&&<li className="py-5 text-muted-foreground">Nenhuma ficha registrada.</li>}</ul></CardContent></Card></main></>
}
