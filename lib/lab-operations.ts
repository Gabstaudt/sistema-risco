import type { ExamRequest, ExamStatus, MedicationOrder, User } from './types'
import { examFiles, validateExamFiles } from './exam-results'
import { hasUserPermission } from './permissions'
export function examActivityTime(exam: ExamRequest) {
 return Math.max(...[exam.solicitadoEm,exam.coletadoEm,exam.performedAt,exam.analisadoEm,exam.concluidoEm,...examFiles(exam).map(file=>file.uploadedAt)].filter(Boolean).map(value=>Date.parse(value!)).filter(Number.isFinite))
}
export function applyExamOperation(exam: ExamRequest,status:ExamStatus,updates:Partial<ExamRequest>,user:User):ExamRequest {
 if(user.role!=='laboratorio'||!hasUserPermission(user,'update_exam_status'))throw new Error('Sem permissão para registrar exames.')
 if(!['solicitado','coletado','em_analise','concluido','cancelado'].includes(status))throw new Error('Situação inválida.')
 if(exam.status==='cancelado'&&status!=='cancelado')throw new Error('O exame foi cancelado.')
 if(status==='concluido'&&!hasUserPermission(user,'register_exam_result'))throw new Error('Sem permissão para liberar resultados.')
 const now=new Date().toISOString()
 const next={...exam,...updates,id:exam.id,patientId:exam.patientId,examTypeId:exam.examTypeId,examCategory:exam.examCategory,resultMode:exam.resultMode,status}
 validateExamFiles(next)
 if(status==='coletado'){next.coletadoEm=updates.coletadoEm||exam.coletadoEm||now;next.coletadoPor=updates.coletadoEm?user.id:exam.coletadoPor||user.id}
 if(status==='em_analise'){next.performedAt=updates.performedAt||exam.performedAt||now;next.performedBy=updates.performedAt?user.id:exam.performedBy||user.id;next.analisadoEm=updates.analisadoEm||exam.analisadoEm||next.performedAt;next.analisadoPor=exam.analisadoPor||user.id}
 if(status==='concluido'){if(!next.resultado?.trim()&&!examFiles(next).length&&!next.anexoUrl)throw new Error('Informe o resultado ou anexe o arquivo.');if(!next.performedAt&&!exam.concluidoEm)throw new Error('Registre a realização do exame antes de liberar o resultado.');next.concluidoEm=updates.concluidoEm||exam.concluidoEm||now;next.concluidoPor=user.id}
 const dates=[next.solicitadoEm,next.coletadoEm,next.performedAt,next.concluidoEm].filter(Boolean) as string[]
 for(const date of dates)if(!Number.isFinite(Date.parse(date))||Date.parse(date)>Date.now()+1000)throw new Error('Informe datas e horários válidos, sem data futura.')
 for(let i=1;i<dates.length;i++)if(Math.floor(Date.parse(dates[i])/1000)<Math.floor(Date.parse(dates[i-1])/1000))throw new Error('Os horários devem respeitar a ordem: solicitação, coleta, realização e resultado.')
 return next
}
export type MedicationDraft=Pick<MedicationOrder,'medication'|'dose'|'route'|'instructions'>
export function prescribeMedication(patientId:string,draft:MedicationDraft,user:User):MedicationOrder {
 if(!['clinico','cirurgiao','cardiologista','anestesista'].includes(user.role)||!hasUserPermission(user,'prescribe_medication'))throw new Error('Sem permissão para solicitar medicações.')
 if(!draft.medication.trim()||!draft.dose.trim()||!draft.route.trim())throw new Error('Informe medicação, dose e via conforme a prescrição.')
 return {...draft,medication:draft.medication.trim(),dose:draft.dose.trim(),route:draft.route.trim(),id:crypto.randomUUID(),patientId,status:'solicitada',requestedAt:new Date().toISOString(),requestedBy:user.id}
}
export function administerMedication(order:MedicationOrder,at:string,user:User):MedicationOrder {
 if(!['laboratorio','enfermaria'].includes(user.role)||!hasUserPermission(user,'administer_medication'))throw new Error('Sem permissão para registrar a administração.')
 if(order.status==='cancelada')throw new Error('Esta solicitação de medicação foi cancelada.')
 if(order.status!=='solicitada')throw new Error('Esta medicação já foi registrada como administrada.')
 if(!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()+1000||Math.floor(Date.parse(at)/1000)<Math.floor(Date.parse(order.requestedAt)/1000))throw new Error('Informe um horário válido de administração, após a solicitação e sem data futura.')
 return {...order,status:'administrada',administeredAt:new Date(at).toISOString(),administeredBy:user.id}
}
