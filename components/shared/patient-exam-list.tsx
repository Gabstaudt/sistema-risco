'use client'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { examActivityTime } from '@/lib/lab-operations'
import type { ExamRequest } from '@/lib/types'
export function PatientExamList({ examRequests, title='Exames do paciente', emptyMessage='Nenhum exame registrado.', showPatient=false }: { examRequests:ExamRequest[]; title?:string; description?:string; emptyMessage?:string; showPatient?:boolean }) {
 const { patients } = useData()
 const exams = [...examRequests].sort((a,b) => examActivityTime(b)-examActivityTime(a))
 return <Card><CardHeader><CardTitle>{title} · {exams.length}</CardTitle></CardHeader><CardContent><ul className="divide-y">{exams.map(exam => <li key={exam.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="break-words font-semibold">{exam.examTypeName}</p>{showPatient && <p className="text-sm font-medium">{patients.find(patient=>patient.id===exam.patientId)?.nomeCompleto}</p>}<p className="text-sm text-muted-foreground">{{solicitado:'Aguardando coleta',coletado:'Coletado — sem resultado',em_analise:'Aguardando resultado',concluido:'Resultado disponível',cancelado:'Cancelado'}[exam.status]} · {new Date(exam.solicitadoEm).toLocaleString('pt-BR')}</p></div><Button asChild variant="outline" className="h-11"><Link href={`/paciente/${exam.patientId}/exames?exame=${exam.id}`}>Abrir exame</Link></Button></li>)}{!exams.length && <li className="py-6 text-muted-foreground">{emptyMessage}</li>}</ul></CardContent></Card>
}
