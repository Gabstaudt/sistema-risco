'use client'
import {useState} from 'react'
import {useData} from '@/lib/data-context'
import {useAuth} from '@/lib/auth'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Textarea} from '@/components/ui/textarea'
import {Button} from '@/components/ui/button'
import {storeExamFile,readExamFile} from '@/lib/exam-files'
import {localTime} from './medication-orders'
import type {ExamRequest} from '@/lib/types'
export function ExamTimeline({exam}:{exam:ExamRequest}){return <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">{[['Solicitado',exam.solicitadoEm],['Coletado',exam.coletadoEm],['Realizado',exam.performedAt],['Resultado liberado',exam.concluidoEm]].map(([label,at])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{at?new Date(at).toLocaleString('pt-BR'):'Ainda não registrado'}</dd></div>)}</dl>}
export function ExamAttachment({exam}:{exam:ExamRequest}){const [error,setError]=useState('');async function download(){setError('');try{const file=await readExamFile(exam.attachment!.id);const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download=exam.attachment!.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){setError(error instanceof Error?error.message:'Não foi possível abrir o arquivo.')}}return <>{exam.attachment&&<Button variant="outline" className="h-11" onClick={download}>Baixar resultado: {exam.attachment.name}</Button>}{error&&<p role="alert" className="text-destructive">{error}</p>}</>}
export function ExamOperations({exam}:{exam:ExamRequest}){
 const {user}=useAuth();const {updateExamStatus}=useData();const [at,setAt]=useState(localTime());const [result,setResult]=useState(exam.resultado||'');const [busy,setBusy]=useState(false);const [error,setError]=useState('')
 const iso=()=>new Date(at).toISOString()
 async function run(action:()=>Promise<void>|void){setBusy(true);setError('');try{await action()}catch(error){setError(error instanceof Error?error.message:'Não foi possível registrar.')}finally{setBusy(false)}}
 return <div className="space-y-4 rounded-xl border bg-card p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{exam.examTypeName}</h3><span className="rounded-md bg-muted px-3 py-1 text-sm font-medium">{{solicitado:'Aguardando coleta',coletado:'Coletado',em_analise:'Aguardando resultado',concluido:'Resultado disponível',cancelado:'Cancelado'}[exam.status]}</span></div><ExamTimeline exam={exam}/>{exam.justificativa&&<p className="whitespace-pre-wrap break-words text-sm">{exam.justificativa}</p>}
 {exam.status!=='cancelado'&&<><div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor={`exam-time-${exam.id}`}>Data e hora do registro</Label><Input id={`exam-time-${exam.id}`} className="h-12" type="datetime-local" step="1" value={at} onChange={event=>setAt(event.target.value)}/></div><Button variant="outline" className="h-12" onClick={()=>setAt(localTime())}>Usar horário atual</Button>{!exam.coletadoEm&&exam.status!=='concluido'&&<Button variant="outline" className="h-12" disabled={busy||!at} onClick={()=>run(()=>updateExamStatus(exam.id,'coletado',{coletadoEm:iso()}))}>Registrar coleta</Button>}{!exam.performedAt&&exam.status!=='concluido'&&<Button className="h-12" disabled={busy||!at} onClick={()=>run(()=>updateExamStatus(exam.id,'em_analise',{performedAt:iso()}))}>Registrar realização</Button>}</div>
 <div className="space-y-2"><Label htmlFor={`exam-result-${exam.id}`}>Resultado / observações</Label><Textarea id={`exam-result-${exam.id}`} value={result} onChange={event=>setResult(event.target.value)} rows={3}/></div>
 <div className="space-y-2"><Label htmlFor={`exam-upload-${exam.id}`}>Arquivo do resultado — PDF, JPG ou PNG (até 10 MB)</Label><Input id={`exam-upload-${exam.id}`} type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy||(!exam.performedAt&&exam.status!=='concluido')} onChange={event=>{const file=event.target.files?.[0];if(!file||!user)return;void run(async()=>{const id=await storeExamFile(file);updateExamStatus(exam.id,exam.status,{attachment:{id,name:file.name,type:file.type,size:file.size,uploadedAt:new Date().toISOString(),uploadedBy:user.id}})});event.target.value=''}}/></div>
 <div className="flex flex-wrap gap-3"><ExamAttachment exam={exam}/><Button className="h-12" disabled={busy||!at||(!result.trim()&&!exam.attachment)||(!exam.performedAt&&exam.status!=='concluido')} onClick={()=>run(()=>updateExamStatus(exam.id,'concluido',{resultado:result.trim(),concluidoEm:iso()}))}>{exam.status==='concluido'?'Atualizar resultado':'Liberar resultado'}</Button></div></>}
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 </div>
}
