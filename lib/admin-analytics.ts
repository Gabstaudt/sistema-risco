import type { AuditLog,ExamRequest,MedicationOrder,Patient,User,UserRole,LabUrgency } from './types'
import type { ReportTable } from './report-export'
import { MANCHESTER_PRIORITIES } from './manchester'
export type Sector='recepcao'|'triagem'|'clinico'|'laboratorio'|'cardiologista'|'anestesista'|'cirurgiao'
export interface CareTiming {id:string;sector:Sector;queuedAt:string;startedAt:string;professionalId:string;encounterEntryAt:string}
export const SECTOR_LABELS:Record<Sector,string>={recepcao:'Recepção',triagem:'Triagem',clinico:'Clínico',laboratorio:'Laboratório',cardiologista:'Cardiologia',anestesista:'Anestesia',cirurgiao:'Cirurgia'}
export interface DateRange {from:string;to:string}
export type PeriodPreset='today'|'3d'|'7d'|'1m'|'3m'|'6m'|'1y'|'custom'
export const PERIODS:{id:PeriodPreset;label:string}[]=[{id:'today',label:'Hoje'},{id:'3d',label:'3 dias'},{id:'7d',label:'7 dias'},{id:'1m',label:'1 mês'},{id:'3m',label:'3 meses'},{id:'6m',label:'6 meses'},{id:'1y',label:'1 ano'},{id:'custom',label:'Personalizado'}]
export const belemDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Belem',year:'numeric',month:'2-digit',day:'2-digit'}).format(date)
export function validDay(day:string){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day}
export function validRange(range:DateRange){return validDay(range.from)&&validDay(range.to)&&range.from<=range.to}
export function presetRange(preset:PeriodPreset,now=new Date()):DateRange {
 const to=belemDay(now);const date=new Date(`${to}T12:00:00Z`)
 if(preset==='3d'||preset==='7d')date.setUTCDate(date.getUTCDate()-(preset==='3d'?2:6))
 else if(['1m','3m','6m','1y'].includes(preset)){const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-({'1m':1,'3m':3,'6m':6,'1y':12}[preset as '1m']||0));const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last))}
 return {from:date.toISOString().slice(0,10),to}
}
export function inRange(at:string|undefined,range:DateRange){if(!at||!validRange(range))return false;const time=Date.parse(at);return Number.isFinite(time)&&time>=Date.parse(`${range.from}T00:00:00-03:00`)&&time<=Date.parse(`${range.to}T23:59:59.999-03:00`)}
const key=(value:string)=>value.trim().toLocaleLowerCase('pt-BR')
function ranking(rows:{name:string}[]){const counts=new Map<string,{name:string;count:number}>();for(const row of rows){const id=key(row.name);const item=counts.get(id)||{name:row.name,count:0};item.count++;counts.set(id,item)}return [...counts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'))}
export function recordCareStart(patient:Patient,sector:Sector,queuedAt:string,professionalId:string,now=new Date()):CareTiming[] {
 const current=patient.careTimings||[]
 if(!Number.isFinite(Date.parse(queuedAt))||Date.parse(queuedAt)>now.getTime())return current
 if(current.some(item=>item.sector===sector&&item.encounterEntryAt===patient.dataEntrada&&item.queuedAt===queuedAt))return current
 return [...current,{id:crypto.randomUUID(),sector,queuedAt,startedAt:now.toISOString(),professionalId,encounterEntryAt:patient.dataEntrada}]
}
export function summarizeAdministration(input:{patients:Patient[];exams:ExamRequest[];medications:MedicationOrder[];audit:AuditLog[];users:User[]},range:DateRange){
 const {patients,exams,medications,audit,users}=input
 const visits=new Map<string,{id:string;patientId:string;patientName:string;entryAt:string;priority?:LabUrgency;outcome:string}>()
 const medical=new Map<string,{id:string;patientId:string;encounterId:string;name:string;professionalId:string;specialty:string;at:string}>()
 const waiting=new Map<string,{id:string;patientId:string;sector:Sector;queuedAt:string;startedAt:string;minutes:number}>()
 const administered=new Map<string,{id:string;patientId:string;name:string;dose:string;route:string;at:string}>()
 function addMedical(patient:Patient,entryAt:string,specialty:UserRole,at:string|undefined,author:string|undefined){
  if(!at||!author)return
  const professional=users.find(user=>user.id===author||user.name===author)
  const id=`${patient.id}|${entryAt}|${specialty}`
  medical.set(id,{id,patientId:patient.id,encounterId:`${patient.id}|${entryAt}`,name:professional?.name||author,professionalId:professional?.id||author,specialty:SECTOR_LABELS[specialty as Sector]||specialty,at})
 }
 function addWait(id:string,patientId:string,sector:Sector,queuedAt:string,startedAt:string){const minutes=(Date.parse(startedAt)-Date.parse(queuedAt))/60000;if(Number.isFinite(minutes)&&minutes>=0&&inRange(startedAt,range))waiting.set(id,{id,patientId,sector,queuedAt,startedAt,minutes})}
 for(const patient of patients){
  const entries=[...(patient.visitHistory||[]),{id:`${patient.id}-visit-current`,entryAt:patient.dataEntrada,reason:patient.queixaPrincipal||'',unit:patient.unidade,outcome:patient.status,triage:{riskClassification:patient.triageData?.manchester?.priority||patient.triageRiskClassification},clinicalSnapshot:{clinicalEvaluation:patient.clinicalEvaluation,avaliacaoClinica:patient.avaliacaoClinica,cardiologyAssessment:patient.cardiologyAssessment,anesthesiaAssessment:patient.anesthesiaAssessment,surgicalRiskAssessment:patient.surgicalRiskAssessment,avaliacaoCirurgica:patient.avaliacaoCirurgica,triageData:patient.triageData}}]
  for(const visit of entries){
   const id=`${patient.id}|${visit.entryAt}`;const previous=visits.get(id)
   visits.set(id,{id,patientId:patient.id,patientName:patient.nomeCompleto,entryAt:visit.entryAt,priority:visit.clinicalSnapshot?.triageData?.manchester?.priority||visit.triage?.riskClassification||previous?.priority,outcome:visit.outcome||previous?.outcome||''})
   const snapshot=visit.clinicalSnapshot
   const clinical=snapshot?.clinicalEvaluation||snapshot?.avaliacaoClinica
   addMedical(patient,visit.entryAt,'clinico',clinical?.completedAt||clinical?.avaliadoEm,clinical?.completedBy||clinical?.avaliadoPor)
   addMedical(patient,visit.entryAt,'cardiologista',snapshot?.cardiologyAssessment?.completedAt,snapshot?.cardiologyAssessment?.completedBy)
   addMedical(patient,visit.entryAt,'anestesista',snapshot?.anesthesiaAssessment?.completedAt,snapshot?.anesthesiaAssessment?.completedBy)
   addMedical(patient,visit.entryAt,'cirurgiao',snapshot?.surgicalRiskAssessment?.completedAt||snapshot?.avaliacaoCirurgica?.avaliadoEm,snapshot?.surgicalRiskAssessment?.completedBy||snapshot?.avaliacaoCirurgica?.avaliadoPor)
   for(const medication of visit.medicationsAdministered||[]){if(!medication.administeredAt)continue;const id=`${patient.id}|${medication.administeredAt}|${key(medication.name)}|${medication.dose||''}|${medication.route||''}`;administered.set(id,{id,patientId:patient.id,name:medication.name,dose:medication.dose||'',route:medication.route||'',at:medication.administeredAt})}
  }
  for(const timing of patient.careTimings||[])addWait(`${patient.id}|${timing.sector}|${timing.encounterEntryAt}|${timing.queuedAt}`,patient.id,timing.sector,timing.queuedAt,timing.startedAt)
 }
 // Audit fills completed assessments absent from snapshots; it never duplicates the same specialty/entry.
 for(const log of audit){if(!log.patientId)continue;const specialty:UserRole|undefined=({avaliacao_clinica_concluida:'clinico',avaliacao_cardiologica_concluida:'cardiologista',avaliacao_anestesica_concluida:'anestesista',avaliacao_cirurgica_concluida:'cirurgiao'} as Record<string,UserRole>)[log.action];if(!specialty)continue;const patient=patients.find(patient=>patient.id===log.patientId);if(!patient)continue;const visit=[...visits.values()].filter(visit=>visit.patientId===patient.id&&Date.parse(visit.entryAt)<=Date.parse(log.timestamp)).sort((a,b)=>Date.parse(b.entryAt)-Date.parse(a.entryAt))[0];if(!visit)continue;const id=`${patient.id}|${visit.entryAt}|${specialty}`;if(!medical.has(id))addMedical(patient,visit.entryAt,specialty,log.timestamp,log.userId||log.userName)}
 for(const order of medications){if(order.status!=='administrada'||!order.administeredAt)continue;const id=`${order.patientId}|${order.administeredAt}|${key(order.medication)}|${order.dose}|${order.route}`;administered.set(id,{id:order.id,patientId:order.patientId,name:order.medication,dose:order.dose,route:order.route,at:order.administeredAt})}
 for(const exam of exams){const startedAt=exam.coletadoEm||exam.performedAt||exam.analisadoEm;if(startedAt&&exam.status!=='cancelado')addWait(`exam|${exam.id}`,exam.patientId,'laboratorio',exam.solicitadoEm,startedAt)}
 const visitRows=[...visits.values()].filter(visit=>inRange(visit.entryAt,range)).sort((a,b)=>Date.parse(b.entryAt)-Date.parse(a.entryAt))
 const medicalRows=[...medical.values()].filter(row=>inRange(row.at,range))
 const medicationRows=[...administered.values()].filter(row=>inRange(row.at,range))
 const performed=exams.filter(exam=>exam.status!=='cancelado'&&inRange(exam.performedAt||exam.analisadoEm,range))
 const examRows=exams.filter(exam=>[exam.solicitadoEm,exam.coletadoEm,exam.performedAt,exam.analisadoEm,exam.concluidoEm].some(at=>inRange(at,range)))
 const classifications=[...Object.entries(MANCHESTER_PRIORITIES).map(([priority,meta])=>({priority,label:meta.label,className:meta.className,count:visitRows.filter(visit=>visit.priority===priority).length})),{priority:'unknown',label:'Não classificado',className:'border-slate-200 bg-slate-50 text-slate-700',count:visitRows.filter(visit=>!visit.priority).length}]
 const waits=(Object.keys(SECTOR_LABELS) as Sector[]).map(sector=>{const samples=[...waiting.values()].filter(row=>row.sector===sector);return {sector,label:SECTOR_LABELS[sector],samples:samples.length,minutes:samples.length?samples.reduce((sum,row)=>sum+row.minutes,0)/samples.length:null}})
 const doctorCounts=new Map<string,{id:string;name:string;count:number}>();for(const row of medicalRows){const item=doctorCounts.get(row.professionalId)||{id:row.professionalId,name:row.name,count:0};item.count++;doctorCounts.set(row.professionalId,item)}
 const doctors=[...doctorCounts.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'pt-BR'));const examRanking=ranking(performed.map(exam=>({name:exam.examTypeName})));const medicationRanking=ranking(medicationRows)
 return {visits:visitRows,medical:medicalRows,medications:medicationRows,exams:examRows,performed,waiting:[...waiting.values()],classifications,doctors,examRanking,medicationRanking,waits,patientsAttended:new Set(medicalRows.map(row=>row.patientId)).size,completedVisits:new Set(medicalRows.map(row=>row.encounterId)).size}
}
export function administrationReports(summary:ReturnType<typeof summarizeAdministration>,range:DateRange):Record<string,ReportTable>{
 const period=`${range.from} a ${range.to}`
 return {
  classificacoes:{title:`Atendimentos por classificação · ${period}`,headers:['Classificação','Entradas'],rows:summary.classifications.map(row=>[row.label,row.count])},
  medicos:{title:`Atendimentos médicos concluídos · ${period}`,headers:['Médico','Avaliações concluídas'],rows:summary.doctors.map(row=>[row.name,row.count])},
  exames:{title:`Exames realizados · ${period}`,headers:['Exame','Quantidade realizada'],rows:summary.examRanking.map(row=>[row.name,row.count])},
  medicacoes:{title:`Medicações utilizadas · ${period}`,headers:['Medicação','Administrações'],rows:summary.medicationRanking.map(row=>[row.name,row.count])},
  pacientes:{title:`Entradas de pacientes · ${period}`,headers:['Paciente','Entrada','Classificação','Desfecho'],rows:summary.visits.map(row=>[row.patientName,row.entryAt,row.priority?MANCHESTER_PRIORITIES[row.priority].label:'Não classificado',row.outcome])},
  esperas:{title:`Tempo médio de espera por setor · ${period}`,headers:['Setor','Média em minutos','Amostras'],rows:summary.waits.map(row=>[row.label,row.minutes===null?'Sem registros':Math.round(row.minutes*100)/100,row.samples])},
  atendimentos:{title:`Detalhamento dos atendimentos concluídos · ${period}`,headers:['Paciente (ID)','Médico','Especialidade','Conclusão'],rows:summary.medical.map(row=>[row.patientId,row.name,row.specialty,row.at])},
  resultados:{title:`Movimentação dos exames · ${period}`,headers:['Paciente (ID)','Exame','Situação','Solicitação','Coleta','Realização','Resultado'],rows:summary.exams.map(exam=>[exam.patientId,exam.examTypeName,exam.status,exam.solicitadoEm,exam.coletadoEm||'',exam.performedAt||exam.analisadoEm||'',exam.concluidoEm||''])},
  administracoes:{title:`Administrações de medicação · ${period}`,headers:['Paciente (ID)','Medicação','Dose prescrita','Via','Administração'],rows:summary.medications.map(row=>[row.patientId,row.name,row.dose,row.route,row.at])},
  tempos:{title:`Detalhamento das esperas · ${period}`,headers:['Paciente (ID)','Setor','Entrada na fila','Início do atendimento','Minutos'],rows:summary.waiting.map(row=>[row.patientId,SECTOR_LABELS[row.sector],row.queuedAt,row.startedAt,Math.round(row.minutes*100)/100])},
  resumo:{title:`Resumo administrativo · ${period}`,headers:['Indicador','Quantidade'],rows:[['Entradas no período',summary.visits.length],['Pacientes distintos atendidos',summary.patientsAttended],['Entradas com avaliação concluída',summary.completedVisits],['Avaliações médicas concluídas',summary.medical.length],['Exames realizados',summary.performed.length],['Medicações administradas',summary.medications.length]]},
 }
}
