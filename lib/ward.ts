import type {Patient,PatientStatus,User,VitalSigns,MedicationOrder} from './types'
import {hasUserPermission} from './permissions'
import {isDoctor} from './medical-profile'
import {userSectorId,type HospitalSector} from './sectors'
export interface WardRecord {id:string;kind:'sinais_vitais'|'observacao'|'reavaliacao';occurredAt:string;recordedAt:string;by:string;byName:string;vitalSigns?:VitalSigns;information:string;notes:string}
export interface WardStay {id:string;sectorId:string;sectorName:string;encounterEntryAt:string;admittedAt:string;admittedBy:string;admittedByName?:string;bed:string;reason:string;previousStatus:PatientStatus;records:WardRecord[];dischargedAt?:string;dischargedBy?:string;dischargedByName?:string;dischargeKind?:'alta'|'encerramento_administrativo';dischargeNotes?:string}
export const WARD_VITAL_FIELDS={bloodPressure:'Pressão arterial (mmHg)',heartRate:'FC (bpm)',respiratoryRate:'FR (irpm)',temperature:'Temperatura (°C)',oxygenSaturation:'SpO₂ (%)',hgt:'HGT (mg/dL)',glasgow:'Glasgow (3–15)',weight:'Peso (kg)'} as const
export type WardVitalsDraft=Record<keyof typeof WARD_VITAL_FIELDS,string>
export interface WardRecordDraft {kind:WardRecord['kind'];occurredAt:string;vitals:WardVitalsDraft;information:string;notes:string}
export const blankWardVitals=():WardVitalsDraft=>Object.fromEntries(Object.keys(WARD_VITAL_FIELDS).map(key=>[key,''])) as WardVitalsDraft
export function activeWardStay(patient:Patient){if(patient.attendanceClosure)return undefined;return patient.wardStays?.find(stay=>!stay.dischargedAt&&stay.encounterEntryAt===patient.dataEntrada)}
export function assertWardAccess(patient:Patient,user:User,permission:string){
 const stay=activeWardStay(patient)
 if(user.role!=='enfermaria'||!hasUserPermission(user,permission)||!stay||stay.sectorId!==userSectorId(user)||patient.attendanceClosure)throw new Error('Paciente não está em acompanhamento neste setor ou acesso não autorizado.')
 return stay
}
export function wardAdmission(patient:Patient,user:User,sector:HospitalSector,reason:string,bed=''):Partial<Patient>{
 const allowed=user.role==='enfermaria'?hasUserPermission(user,'ward_admit')&&userSectorId(user)===sector.id:isDoctor(user)?hasUserPermission(user,'transfer_patient'):user.role==='triagem'&&hasUserPermission(user,'forward_triage_sector')
 if(!allowed||!sector.active||sector.role!=='enfermaria')throw new Error('Sem permissão para admitir neste setor.')
 if(patient.attendanceClosure||['concluido','liberado','contraindicado'].includes(patient.status))throw new Error('A entrada hospitalar está encerrada. Registre um novo atendimento.')
 if(user.role==='enfermaria'&&patient.medicalConsultations?.some(record=>!record.endedAt))throw new Error('A consulta médica está em andamento. O médico pode encaminhar o paciente para a enfermaria.')
 if(patient.status==='em_enfermaria')throw new Error('O paciente já está na enfermaria.')
 if(patient.wardStays?.some(stay=>!stay.dischargedAt))throw new Error('O paciente já está em acompanhamento na enfermaria.')
 if(!reason.trim())throw new Error('Informe o motivo da entrada na enfermaria.')
 const stay:WardStay={id:crypto.randomUUID(),sectorId:sector.id,sectorName:sector.name,encounterEntryAt:patient.dataEntrada,admittedAt:new Date().toISOString(),admittedBy:user.id,admittedByName:user.name,bed:bed.trim(),reason:reason.trim(),previousStatus:patient.status,records:[]}
 return {status:'em_enfermaria',wardStays:[...(patient.wardStays||[]),stay]}
}
export function cleanWardVitals(draft:WardVitalsDraft):VitalSigns{
 const values:VitalSigns={}
 for(const key of Object.keys(WARD_VITAL_FIELDS) as (keyof WardVitalsDraft)[]){
  const value=draft[key].trim()
  if(!value)continue
  if(key==='bloodPressure'){if(!/^\d{2,3}\s*\/\s*\d{2,3}$/.test(value))throw new Error('Informe a pressão arterial no formato 120/80.');values.bloodPressure=value.replace(/\s/g,'');continue}
  const number=Number(value.replace(',','.'))
  if(!Number.isFinite(number)||number<0||key==='oxygenSaturation'&&number>100||key==='glasgow'&&(!Number.isInteger(number)||number<3||number>15))throw new Error('Revise o campo '+WARD_VITAL_FIELDS[key]+'.')
  values[key]=number
 }
 return values
}
export function appendWardRecord(patient:Patient,user:User,draft:WardRecordDraft):Partial<Patient>{
 const permission={sinais_vitais:'ward_record_vitals',observacao:'ward_observations',reavaliacao:'ward_reassess'}[draft.kind]
 if(!permission)throw new Error('Tipo de registro inválido.')
 const stay=assertWardAccess(patient,user,permission)
 const at=Date.parse(draft.occurredAt)
 if(!Number.isFinite(at)||Math.floor(at/1000)<Math.floor(Date.parse(stay.admittedAt)/1000)||at>Date.now()+1000)throw new Error('Informe data e hora válidas, após a entrada na enfermaria e sem data futura.')
 const vitalSigns=draft.kind==='observacao'?{}:cleanWardVitals(draft.vitals)
 if(draft.kind==='sinais_vitais'&&!Object.keys(vitalSigns).length)throw new Error('Preencha ao menos um sinal vital.')
 if(draft.kind==='observacao'&&!draft.notes.trim()&&!draft.information.trim())throw new Error('Preencha as informações ou observações.')
 if(draft.kind==='reavaliacao'&&!draft.notes.trim())throw new Error('Descreva a reavaliação do paciente.')
 const record:WardRecord={id:crypto.randomUUID(),kind:draft.kind,occurredAt:new Date(at).toISOString(),recordedAt:new Date().toISOString(),by:user.id,byName:user.name,vitalSigns:Object.keys(vitalSigns).length?vitalSigns:undefined,information:draft.information.trim(),notes:draft.notes.trim()}
 return {wardStays:patient.wardStays!.map(item=>item.id===stay.id?{...item,records:[...item.records,record]}:item)}
}
export function dischargeWard(patient:Patient,user:User,notes:string):Partial<Patient>{
 const stay=assertWardAccess(patient,user,'ward_discharge')
 if(!notes.trim())throw new Error('Informe as observações e o destino após a alta da enfermaria.')
 const returnStatus:Partial<Record<PatientStatus,PatientStatus>>={em_avaliacao_clinica:'aguardando_clinico',em_triagem:'aguardando_triagem',em_avaliacao_cardiologica:'aguardando_cardiologista',em_avaliacao_anestesica:'aguardando_anestesista',em_avaliacao_cirurgica:'aguardando_cirurgiao'}
 return {status:patient.status==='em_enfermaria'?(returnStatus[stay.previousStatus]||stay.previousStatus):patient.status,wardStays:patient.wardStays!.map(item=>item.id===stay.id?{...item,dischargedAt:new Date().toISOString(),dischargedBy:user.id,dischargedByName:user.name,dischargeKind:'alta' as const,dischargeNotes:notes.trim()}:item)}
}
export function wardDateVisible(patient:Patient,at:string,user:User){
 return patient.wardStays?.some(stay=>stay.sectorId===userSectorId(user)&&Date.parse(at)>=Date.parse(stay.encounterEntryAt)&&(!stay.dischargedAt||Date.parse(at)<=Date.parse(stay.dischargedAt)))||false
}
export function wardMedicationVisible(patient:Patient,order:MedicationOrder,user:User){return wardDateVisible(patient,order.requestedAt,user)}
