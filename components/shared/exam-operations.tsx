'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { storeExamFile, readExamFile } from '@/lib/exam-files'
import { examFiles, examResultMode } from '@/lib/exam-results'
import { localTime } from './medication-orders'
import type { ExamRequest, ExamAttachmentFile } from '@/lib/types'
export function ExamTimeline({ exam }: { exam: ExamRequest }) {
 return <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">{[['Solicitado',exam.solicitadoEm],['Coletado',exam.coletadoEm],['Realizado',exam.performedAt],['Resultado liberado',exam.concluidoEm]].map(([label,at]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{at ? new Date(at).toLocaleString('pt-BR') : 'Ainda não registrado'}</dd></div>)}</dl>
}
export function ExamFile({ file, preview = false }: { file: ExamAttachmentFile; preview?: boolean }) {
 const [url, setUrl] = useState('')
 const [error, setError] = useState('')
 useEffect(() => {
  let alive = true; let objectUrl = ''
  readExamFile(file.id).then(blob => { if (alive) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl) } }).catch(error => { if (alive) setError(error instanceof Error ? error.message : 'Arquivo indisponível.') })
  return () => { alive = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
 }, [file.id])
 return <div className="min-w-0 space-y-2">
  <div className="flex flex-wrap gap-2 print:hidden">{url ? <><Button asChild variant="outline" className="h-11"><a href={url} target="_blank" rel="noopener noreferrer">Abrir / imprimir arquivo: {file.name}</a></Button><Button asChild variant="outline" className="h-11"><a href={url} download={file.name}>Baixar resultado: {file.name}</a></Button></> : <span className="text-sm text-muted-foreground">{file.name}</span>}</div>
  {preview && url && file.type.startsWith('image/') && <img src={url} alt={file.name} className="max-h-[36rem] max-w-full rounded-lg border object-contain print:max-h-[20cm]" />}
  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
 </div>
}
export function ExamAttachment({ exam, preview = false }: { exam: ExamRequest; preview?: boolean }) {
 return <div className="space-y-3">{examFiles(exam).map(file => <ExamFile key={file.id} file={file} preview={preview} />)}</div>
}
export function ExamOperations({ exam }: { exam: ExamRequest }) {
 const { user, hasPermission } = useAuth()
 const { updateExamStatus, examTypes } = useData()
 const [at, setAt] = useState(localTime())
 const [result, setResult] = useState(exam.resultado || '')
 const [busy, setBusy] = useState(false)
 const [error, setError] = useState('')
 const operation = useRef(false)
 const files = examFiles(exam)
 const mode = examResultMode(exam, examTypes.find(type => type.id === exam.examTypeId))
 const writable = hasPermission('update_exam_status') && exam.status !== 'cancelado'
 const iso = () => new Date(at).toISOString()
 async function run(action: () => Promise<void> | void) {
  if (operation.current) return
  operation.current = true; setBusy(true); setError('')
  try { await action() } catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível registrar.') } finally { operation.current = false; setBusy(false) }
 }
 return <div className="space-y-4 rounded-xl border bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{exam.examTypeName}</h3><span className="rounded-md bg-muted px-3 py-1 text-sm font-medium">{{solicitado:'Aguardando coleta',coletado:'Coletado',em_analise:'Aguardando resultado',concluido:'Resultado disponível',cancelado:'Cancelado'}[exam.status]}</span></div>
  <ExamTimeline exam={exam} />{exam.justificativa && <p className="whitespace-pre-wrap break-words text-sm">{exam.justificativa}</p>}
  {writable && <>
   {exam.status !== 'concluido' && <div className="flex flex-wrap items-end gap-3"><div className="space-y-2"><Label htmlFor={`exam-time-${exam.id}`}>Data e hora do registro</Label><Input id={`exam-time-${exam.id}`} className="h-12" type="datetime-local" step="1" value={at} onChange={event => setAt(event.target.value)} /></div><Button variant="outline" className="h-12" onClick={() => setAt(localTime())}>Usar horário atual</Button>{!exam.coletadoEm && <Button variant="outline" className="h-12" disabled={busy || !at} onClick={() => run(() => updateExamStatus(exam.id, 'coletado', { coletadoEm: iso() }))}>Registrar coleta</Button>}{!exam.performedAt && <Button className="h-12" disabled={busy || !at} onClick={() => run(() => updateExamStatus(exam.id, 'em_analise', { performedAt: iso() }))}>Registrar realização</Button>}</div>}
   <div className="space-y-2"><Label htmlFor={`exam-result-${exam.id}`}>Resultado / observações</Label><Textarea id={`exam-result-${exam.id}`} value={result} onChange={event => setResult(event.target.value)} rows={3} /></div>
   {(mode === 'multiple_images' || files.length === 0) && <div className="space-y-2"><Label htmlFor={`exam-upload-${exam.id}`}>{mode === 'multiple_images' ? 'Adicionar imagens — JPG ou PNG (até 10 MB por imagem)' : 'Arquivo do resultado — 1 PDF, JPG ou PNG (até 10 MB)'}</Label><Input id={`exam-upload-${exam.id}`} type="file" accept={mode === 'multiple_images' ? 'image/jpeg,image/png' : 'application/pdf,image/jpeg,image/png'} multiple={mode === 'multiple_images'} disabled={busy || !exam.performedAt} onChange={event => {
    const incoming = Array.from(event.target.files || []); event.target.value = ''
    if (!incoming.length || !user) return
    void run(async () => {
      if (mode !== 'multiple_images' && incoming.length + files.length > 1) throw new Error('Este exame permite apenas um arquivo de resultado.')
      if (mode === 'multiple_images' && incoming.some(file => !['image/jpeg','image/png'].includes(file.type))) throw new Error('Selecione apenas imagens JPG ou PNG.')
      const saved: ExamAttachmentFile[] = []
      for (const file of incoming) { const id = await storeExamFile(file); saved.push({ id, name: file.name, type: file.type, size: file.size, uploadedAt: new Date().toISOString(), uploadedBy: user.id }) }
      updateExamStatus(exam.id, exam.status, { attachments: [...files, ...saved], attachment: undefined })
    })
   }} /></div>}
  </>}
  <ExamAttachment exam={exam} preview />
  {!writable && <p className="whitespace-pre-wrap break-words">{exam.resultado || 'Resultado ainda não liberado.'}</p>}
  <div className="flex flex-wrap gap-3">
   {writable && <Button className="h-12" disabled={busy || !at || (!result.trim() && !files.length) || (!exam.performedAt && exam.status !== 'concluido')} onClick={() => run(() => updateExamStatus(exam.id, 'concluido', { resultado: result.trim(), concluidoEm: exam.status === 'concluido' ? exam.concluidoEm : iso() }))}>{exam.status === 'concluido' ? 'Atualizar resultado' : 'Liberar resultado'}</Button>}
   {hasPermission('print_exams') && <Button asChild variant="outline" className="h-12"><Link href={`/paciente/${exam.patientId}/imprimir?tipo=exames&exame=${exam.id}`} target="_blank">Imprimir exame</Link></Button>}
  </div>
  {error && <p role="alert" className="text-destructive">{error}</p>}
 </div>
}
