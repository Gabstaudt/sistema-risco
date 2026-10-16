'use client'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
export function PatientPrintActions({ patientId }: { patientId: string }) {
 const { hasPermission } = useAuth()
 return <div className="flex flex-wrap gap-2 print:hidden">
  {[['print_patient_record', 'prontuario', 'Imprimir prontuário', 'view_patient_basic'], ['print_patient_history', 'historico', 'Imprimir histórico', 'view_patient_history'], ['print_medication_sheet', 'medicacoes', 'Imprimir ficha de medicação', 'view_patient_basic'], ['print_exams', 'exames', 'Imprimir exames', 'view_exam_results']].map(([permission, kind, label, read]) => hasPermission(permission) && hasPermission(read) && <Button key={kind} asChild variant="outline" className="h-11"><Link href={`/paciente/${patientId}/imprimir?tipo=${kind}`} target="_blank">{label}</Link></Button>)}
  {(hasPermission('issue_prescription') || hasPermission('issue_certificate')) && <Button asChild className="h-11"><Link href={`/paciente/${patientId}/documentos`}>Receitas e atestados</Link></Button>}
  {hasPermission('print_medication_sheet') && <Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patientId}/medicacoes`}>Ficha de medicação</Link></Button>}
 </div>
}
