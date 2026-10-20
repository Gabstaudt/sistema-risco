'use client'
import {deductAdministeredMedication} from './pharmacy'
import {readMedicationOrders,readPharmacy,writePharmacy,pharmacyLock,PHARMACY_EVENT} from './pharmacy-storage'
import {validateExamConfiguration, examReferenceForAge, patientAgeAtRequest} from './laboratory-settings'
import {activeWardStay,wardAdmission,appendWardRecord,dischargeWard,assertWardAccess,wardDateVisible,wardMedicationVisible,type WardRecordDraft} from './ward'
import {wardDemoMedications} from './data/ward'
import {consultation,medicalTransfer,assertMedicalCare,type ConsultationRecord,type TransferDraft} from './medical-care'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Patient, PatientStatus, Priority, VitalSigns, ClinicalEvaluation, SurgicalEvaluation, AuditLog, AuditAction, ExamRequest, ExamType, ExamStatus, MedicationOrder, MedicalDocument } from './types'
import { patients as initialPatients, examRequests as initialExamRequests, hydratePatient } from './data/patients'
import { examTypes as initialExamTypes } from './data/exams'
import { auditLogs as initialAuditLogs } from './data/audit'
import { hasPendingAssessment } from './assessment-requests'
import { intakeUpdates, updateReceptionAttendance, closeReceptionAttendance, type IntakeDraft } from './reception-attendance'
import { cleanRegistration, registrationDraft } from './patient-registration'
import { recordCareStart } from './admin-analytics'
import { nextAssessmentStatus } from './assessment-requests'
import { applyExamOperation, prescribeMedication, administerMedication, type MedicationDraft } from './lab-operations'
import { useAuth } from './auth'
import { issueMedicalDocument, type MedicalDocumentDraft } from './medical-documents'
import { isPatientAssignedToDoctor } from './medical-profile'
import { hasUserPermission,projectPatientForUser } from './permissions'
import { issueArrivalTicket, callArrivalTicket, forwardArrivalTicket, seedArrivalTickets, ensureClinicalTickets, markTicketAttendance, type TicketCallStage, type ArrivalTicket, type TicketCategory } from './tickets'
import { validatePatientBasicEdit, type PatientBasicDraft } from './patient-basic-edit'

interface DataContextType {
  wardCandidates:Patient[]
  admitWard:(patientId:string,reason:string,bed:string)=>Promise<void>
  recordWard:(patientId:string,draft:WardRecordDraft)=>Promise<void>
  dischargeFromWard:(patientId:string,notes:string)=>Promise<void>
  consultations:ConsultationRecord[]
  saveConsultation:(patientId:string,action:'start'|'save'|'finish',anamnesis?:string)=>Promise<void>
  transferMedicalPatient:(patientId:string,draft:TransferDraft)=>Promise<void>
  callMedicalPatient:(patientId:string)=>Promise<void>
  registerCareStart: (patientId:string) => void
  isDataReady: boolean
  tickets: ArrivalTicket[]
  publicCalls: Pick<ArrivalTicket, 'number' | 'stage' | 'category' | 'calledAt' | 'day' | 'destination'>[]
  markTicketAbsent: (id: string, restore?: boolean) => Promise<void>
  issueTicket: (category: TicketCategory) => Promise<ArrivalTicket>
  callTicket: (stage: TicketCallStage, id?: string) => Promise<ArrivalTicket>
  beginTicketTriage: (id: string) => Promise<string>
  beginTicketClinical: (id: string) => Promise<string>
  forwardExistingPatient: (ticketId: string, patientId: string, intake: IntakeDraft) => Promise<void>
  updateAttendance: (patientId:string, draft:IntakeDraft) => Promise<void>
  closeAttendance: (patientId:string, kind:'baixa'|'cancelamento', reason:string) => Promise<void>

  // Pacientes
  patients: Patient[]
  getPatient: (id: string) => Patient | undefined
  getPatientById: (id: string) => Patient | undefined
  getPatientsByStatus: (status: PatientStatus | PatientStatus[]) => Patient[]
  createPatient: (patient: Omit<Patient, 'id' | 'prontuario' | 'cadastradoEm' | 'ultimaAtualizacao' | 'ultimoAtualizadoPor'>) => Promise<Patient>
  updatePatient: (id: string, updates: Partial<Patient>) => void
  updatePatientBasic: (id: string, draft: PatientBasicDraft) => Promise<void>
  updatePatientStatus: (id: string, status: PatientStatus) => void
  registerVitalSigns: (id: string, vitalSigns: VitalSigns) => void
  registerClinicalEvaluation: (id: string, evaluation: Omit<ClinicalEvaluation, 'id' | 'patientId'>) => void
  registerSurgicalEvaluation: (id: string, evaluation: Omit<SurgicalEvaluation, 'id' | 'patientId'>) => void
  
  medicalDocuments: MedicalDocument[]
  createMedicalDocument: (patientId: string, draft: MedicalDocumentDraft) => Promise<MedicalDocument>
  medicationOrders: MedicationOrder[]
  prescribeMedicationOrder: (patientId: string, draft: MedicationDraft) => Promise<void>
  recordMedicationAdministration: (id: string, at: string) => Promise<void>
  // Exames
  examTypes: ExamType[]
  examRequests: ExamRequest[]
  getExamRequestsByPatient: (patientId: string) => ExamRequest[]
  getExamRequestsByStatus: (status: ExamStatus | ExamStatus[]) => ExamRequest[]
  getPendingExams: () => ExamRequest[]
  updateExamType: (id:string, draft:Partial<ExamType>) => void
  createExamType: (examType: Omit<ExamType, 'id' | 'createdAt'>) => ExamType
  requestExams: (patientId: string, examTypeIds: string[], justificativa: string) => void
  updateExamStatus: (examId: string, status: ExamStatus, updates?: Partial<ExamRequest>) => void
  
  // Auditoria
  auditLogs: AuditLog[]
  getAuditLogsByPatient: (patientId: string) => AuditLog[]
  getPatientAuditLogs: (patientId: string) => AuditLog[]
  addAuditLog: (log: AuditLogInput) => void
  
  // Estatisticas
  getStats: () => {
    totalPacientes: number
    aguardandoTriagem: number
    emAvaliacaoClinica: number
    examesPendentes: number
    aguardandoCardiologia: number
    aguardandoAnestesia: number
    aguardandoCirurgiao: number
    liberados: number
    altoRisco: number
    contraindicados: number
  }
}

type AuditLogInput = Omit<Partial<AuditLog>, 'id' | 'timestamp' | 'userName' | 'userRole'> & {
  action: AuditAction
  description?: string
  details?: string
}

const DataContext = createContext<DataContextType | undefined>(undefined)

const PATIENTS_KEY = 'hospital-patients'
const EXAM_TYPES_KEY = 'hospital-exam-types'
const EXAM_REQUESTS_KEY = 'hospital-exam-requests'
const AUDIT_KEY = 'hospital-audit'
const TICKETS_KEY = 'hospital-tickets'
const MEDICATIONS_KEY = 'hospital-medication-orders'
const DOCUMENTS_KEY = 'hospital-medical-documents'

const normalizePatient = (patient: Patient) => hydratePatient(patient)
const normalizePatients = (items: Patient[]) => items.map(normalizePatient)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, users,sectors,hasPermission:hasProfilePermission } = useAuth()
  const hasPermission=useCallback((permission:string)=>hasUserPermission(user,permission),[user])
  const [medicalDocuments, setMedicalDocuments] = useState<MedicalDocument[]>([])
  const [medicationOrders, setMedicationOrders] = useState<MedicationOrder[]>([])
  const [tickets, setTickets] = useState<ArrivalTicket[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Keep full mock records internal; public reads follow the current session permissions.
  const visiblePatients = useMemo(() => patients.flatMap((patient) => {
    const visible = projectPatientForUser(patient, user)
    return visible ? [visible] : []
  }), [patients, user])
  const visibleIds = new Set(visiblePatients.map(patient => patient.id))
  const visibleExamRequests = hasPermission('view_exam_results') ? examRequests.filter(exam => visibleIds.has(exam.patientId)&&(user?.role!=='enfermaria'||Boolean(patients.find(p=>p.id===exam.patientId)&&wardDateVisible(patients.find(p=>p.id===exam.patientId)!,exam.solicitadoEm,user)))) : []
  const visibleAuditLogs = hasPermission('view_patient_audit') ? auditLogs.filter(log => !log.patientId || visibleIds.has(log.patientId)) : []

  useEffect(()=>{const refresh=()=>setMedicationOrders(readMedicationOrders());window.addEventListener(PHARMACY_EVENT,refresh);const onStorage=(event:StorageEvent)=>{if(event.key==='medrisk-pharmacy')refresh()};window.addEventListener('storage',onStorage);return()=>{window.removeEventListener(PHARMACY_EVENT,refresh);window.removeEventListener('storage',onStorage)}},[])

  // Carregar dados do localStorage ou usar dados iniciais
  useEffect(() => {
    const savedPatients = localStorage.getItem(PATIENTS_KEY)
    const savedExamTypes = localStorage.getItem(EXAM_TYPES_KEY)
    const savedExamRequests = localStorage.getItem(EXAM_REQUESTS_KEY)
    const savedAudit = localStorage.getItem(AUDIT_KEY)
    setMedicalDocuments(JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]'))
    const savedMedications:MedicationOrder[]=readMedicationOrders()
    const wardSeeded=localStorage.getItem('medrisk-ward-demo-seeded')
    const orders=wardSeeded?savedMedications:[...savedMedications,...wardDemoMedications.filter(order=>!savedMedications.some(item=>item.id===order.id))]
    if(!wardSeeded){localStorage.setItem('medrisk-ward-demo-seeded','1');localStorage.setItem(MEDICATIONS_KEY,JSON.stringify(orders))}
    setMedicationOrders(orders)

    if (savedPatients) {
      const saved: Patient[] = JSON.parse(savedPatients)
      const merged = saved.map((patient) => {
        const seed = initialPatients.find((item) => item.id === patient.id)
        const existing = patient.visitHistory || []
        const missingVisits = (seed?.visitHistory || []).filter((visit) =>
          visit.id !== `${patient.id}-visit-current` && !existing.some((item) => item.id === visit.id))
        const assignments = Object.fromEntries(['triageAssignedClinicianId', 'clinicalAssignedCardiologistId', 'cardiologyAssignedAnesthesiologistId', 'clinicalAssignedSurgeonId'].filter(key => !Object.hasOwn(patient, key)).map(key => [key, seed?.[key as keyof Patient]]))
        return { ...assignments, ...patient, visitHistory: [...existing, ...missingVisits] }
      })
      setPatients(normalizePatients([...merged, ...initialPatients.filter((seed) => !saved.some((patient) => patient.id === seed.id))]))
    } else {
      setPatients(initialPatients)
    }
    setExamTypes(savedExamTypes ? JSON.parse(savedExamTypes) : initialExamTypes)
    setExamRequests(savedExamRequests ? JSON.parse(savedExamRequests) : initialExamRequests)
    setAuditLogs(savedAudit ? JSON.parse(savedAudit) : initialAuditLogs)
    const ticketPatients: Patient[] = savedPatients ? normalizePatients(JSON.parse(savedPatients)) : initialPatients
    const storedTickets = localStorage.getItem(TICKETS_KEY)
    const loadedTickets: ArrivalTicket[] = storedTickets ? ensureClinicalTickets(JSON.parse(storedTickets), ticketPatients) : seedArrivalTickets(ticketPatients)
    localStorage.setItem(TICKETS_KEY, JSON.stringify(loadedTickets))
    setTickets(loadedTickets)
    setPatients(previous => previous.map(patient => {
      const ticket = loadedTickets.find(item => item.patientId === patient.id && item.stage !== 'concluida')
      return ticket ? { ...patient, ticketId: ticket.id, ticketNumber: ticket.number } : patient
    }))
    setIsInitialized(true)
  }, [])

  // Persistir dados no localStorage
  useEffect(() => {
    if (isInitialized) {
      const value = JSON.stringify(patients)
      if (localStorage.getItem(PATIENTS_KEY) !== value) localStorage.setItem(PATIENTS_KEY, value)
    }
  }, [patients, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(EXAM_TYPES_KEY, JSON.stringify(examTypes))
    }
  }, [examTypes, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(EXAM_REQUESTS_KEY, JSON.stringify(examRequests))
    }
  }, [examRequests, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLogs))
    }
  }, [auditLogs, isInitialized])

  // Helper para gerar IDs
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Helper para adicionar log de auditoria
  const addAuditLog = useCallback((log: AuditLogInput) => {
    if (!user||user.previewMode) return
    
    const newLog: AuditLog = {
      ...log,
      id: generateId('audit'),
      userId: log.userId || user.id,
      userName: user.name,
      userRole: user.role,
      description: log.description || log.details || '',
      details: log.details || log.description,
      timestamp: new Date().toISOString(),
    }
    
    setAuditLogs(prev => [...prev, newLog])
  }, [user])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === MEDICATIONS_KEY && event.newValue) setMedicationOrders(readMedicationOrders())
      if (event.key === EXAM_TYPES_KEY && event.newValue) setExamTypes(JSON.parse(event.newValue))
      if (event.key === EXAM_REQUESTS_KEY && event.newValue) setExamRequests(JSON.parse(event.newValue))
      if (event.key === TICKETS_KEY && event.newValue) setTickets(JSON.parse(event.newValue))
      if (event.key === AUDIT_KEY && event.newValue) setAuditLogs(JSON.parse(event.newValue))
      if (event.key === DOCUMENTS_KEY && event.newValue) setMedicalDocuments(JSON.parse(event.newValue))
      if (event.key === PATIENTS_KEY && event.newValue) setPatients(normalizePatients(JSON.parse(event.newValue)))
    }
    const syncAudit = () => setAuditLogs(JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]'))
    window.addEventListener('medrisk-audit-updated', syncAudit)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('medrisk-audit-updated', syncAudit) }
  }, [])

  const mutateTickets = useCallback(async <T,>(change: (current: ArrivalTicket[]) => { tickets: ArrivalTicket[]; result: T }): Promise<T> => {
    if(user?.previewMode)throw new Error('Visualização de perfil: alterações não são permitidas.')
    if (!isInitialized) throw new Error('Aguarde o carregamento da fila.')
    const run = () => {
      const current: ArrivalTicket[] = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]')
      const next = change(current)
      localStorage.setItem(TICKETS_KEY, JSON.stringify(next.tickets))
      setTickets(next.tickets)
      return next.result
    }
    return navigator.locks ? navigator.locks.request('medrisk-ticket-flow', run) : run()
  }, [isInitialized,user?.previewMode])

  const issueTicket = useCallback((category: TicketCategory) => mutateTickets(current => {
    const ticket = issueArrivalTicket(current, category)
    return { tickets: [...current, ticket], result: ticket }
  }), [mutateTickets])

  const callTicket = useCallback(async (stage: TicketCallStage, id?: string) => {
    if (!user) throw new Error('Faça login para chamar senhas.')
    const ticket = await mutateTickets(current => {
      const scoped = stage === 'clinico' ? ensureClinicalTickets(current, patients) : current
      const next = callArrivalTicket(scoped, user, stage, id)
      return { tickets: next.tickets, result: next.ticket }
    })
    addAuditLog({ action: 'senha_chamada', patientId: ticket.patientId, details: `Senha ${ticket.number} chamada na ${stage}.` })
    return ticket
  }, [user, patients, mutateTickets, addAuditLog])

  const markTicketAbsent = useCallback(async (id: string, restore = false) => {
    if (!user) throw new Error('Faça login para atualizar a fila.')
    await mutateTickets(current => ({ tickets: markTicketAttendance(current, id, user, restore), result: undefined }))
    addAuditLog({ action: restore ? 'senha_retornada' : 'senha_ausente', details: `Senha ${tickets.find(ticket => ticket.id === id)?.number || id}: ${restore ? 'retornada à fila' : 'não compareceu'}.` })
  }, [user, tickets, mutateTickets, addAuditLog])

  const beginTicketTriage = useCallback((id: string) => mutateTickets(current => {
    const ticket = current.find(item => item.id === id)
    if (!user || user.role !== 'triagem' || !hasPermission('call_triage_ticket') || !ticket?.patientId || !['chamada_triagem', 'em_triagem'].includes(ticket.stage) || ticket.calledBy !== user.id) throw new Error('Chame a senha antes de iniciar a triagem.')
    const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
    const nextPatients = stored.map(patient => patient.id === ticket.patientId ? { ...patient, status: 'em_triagem' as const, careTimings: recordCareStart(patient, 'triagem', ticket.forwardedAt || patient.dataEntrada, user.id,new Date(),user) } : patient)
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
    return { tickets: current.map(item => item.id === id ? { ...item, stage: 'em_triagem' as const } : item), result: ticket.patientId }
  }), [user, hasPermission, mutateTickets])

  const beginTicketClinical = useCallback((id: string) => mutateTickets(current => {
    const ticket = current.find(item => item.id === id)
    if (!user || user.role !== 'clinico' || !hasPermission('clinical_evaluation') || !ticket?.patientId || ticket.clinicalAssignedTo !== user.id || ticket.calledBy !== user.id || !['chamada_clinico', 'em_clinico'].includes(ticket.stage)) throw new Error('Chame a senha deste paciente antes de iniciar o atendimento.')
    const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
    if (!stored.some(patient => patient.id === ticket.patientId && isPatientAssignedToDoctor(patient, user))) throw new Error('Paciente não direcionado para este médico.')
    const nextPatients = stored.map(patient => patient.id === ticket.patientId ? { ...patient, status: 'em_avaliacao_clinica' as const, careTimings: recordCareStart(patient, 'clinico', ticket.clinicalQueuedAt || patient.triageData?.completedAt || '', user.id,new Date(),user) } : patient)
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
    return { tickets: current.map(item => item.id === id ? { ...item, stage: 'em_clinico' as const } : item), result: ticket.patientId }
  }), [user, hasPermission, mutateTickets])

  const forwardExistingPatient = useCallback((ticketId: string, patientId: string, intake: IntakeDraft) => mutateTickets(current => {
    if (!user) throw new Error('Faça login para encaminhar pacientes.')
    if (!intake.complaint.trim()) throw new Error('Informe as queixas para registrar a entrada.')
    const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
    const patient = stored.find(item => item.id === patientId)
    if (!patient) throw new Error('Paciente não encontrado.')
    if (!['concluido', 'liberado', 'contraindicado'].includes(patient.status)) throw new Error('Este paciente já possui um atendimento em andamento.')
    const updates = intakeUpdates(intake, users)
    const direct=user.role==='triagem'
    if(direct&&(!hasPermission('create_patient')||!hasPermission('forward_to_triage')||intake.route!=='com_triagem'))throw new Error('Sem permissão para iniciar este atendimento na triagem.')
    const issued=direct?issueArrivalTicket(current,'comum'):undefined
    const source=issued?[...current,{...issued,patientId,stage:'aguardando_triagem' as const,forwardedAt:new Date().toISOString()}]:forwardArrivalTicket(current,ticketId,patientId,user)
    if(issued)ticketId=issued.id
    const nextTickets = source.map(ticket=>ticket.id===ticketId&&intake.route==='sem_triagem'?{...ticket,stage:'aguardando_clinico' as const,clinicalAssignedTo:updates.triageAssignedClinicianId,clinicalQueuedAt:new Date().toISOString()}:ticket)
    const ticket = nextTickets.find(item => item.id === ticketId)!
    const previous = patient.visitHistory || []
    const currentVisit = previous.find(item => item.id === `${patient.id}-visit-current`)
    const archived = currentVisit ? { ...currentVisit, id: `${patient.id}-visit-${crypto.randomUUID()}`, dischargeAt: currentVisit.dischargeAt || patient.dischargeAt || patient.ultimaAtualizacao, clinicalSnapshot: { triageData: patient.triageData, examResults: patient.examResults, avaliacaoClinica: patient.avaliacaoClinica, avaliacaoCirurgica: patient.avaliacaoCirurgica, clinicalEvaluation: patient.clinicalEvaluation, cardiologyAssessment: patient.cardiologyAssessment, anesthesiaAssessment: patient.anesthesiaAssessment, surgicalRiskAssessment: patient.surgicalRiskAssessment } } : undefined
    const updated = normalizePatient({ ...patient, attendanceClosure:undefined, ticketId, ticketNumber: ticket.number, status: 'aguardando_triagem', dataEntrada: new Date().toISOString(), dischargeAt: undefined,
      triageData: undefined, sinaisVitais: undefined, triageRiskClassification: undefined, observacoesTriagem: undefined, clinicalEvaluation: undefined, avaliacaoClinica: undefined, cardiologyAssessment: undefined, anesthesiaAssessment: undefined, surgicalRiskAssessment: undefined, avaliacaoCirurgica: undefined, riskLevel: undefined, assessmentRequests: undefined, surgicalRiskRequest: undefined, clinicalRequestsSurgicalRisk: false, clinicalAssignedCardiologistId: undefined, clinicalAssignedCardiologistName: undefined, cardiologyAssignedAnesthesiologistId: undefined, cardiologyAssignedAnesthesiologistName: undefined, clinicalAssignedSurgeonId: undefined, clinicalAssignedSurgeonName: undefined, triageAssignedClinicianId: undefined, triageAssignedClinicianName: undefined, labRiskClassification: undefined, labRiskNotes: undefined, labNurseObservation: undefined, queixaPrincipal: intake.complaint.trim(), descricaoInicial: intake.notes.trim(), prioridade: 'normal', examesSolicitados: [], examResults: undefined,
      visitHistory: [...previous.filter(item => item.id !== `${patient.id}-visit-current`), ...(archived ? [archived] : [])], ...updates })
    const sourceTicket = current.find(item => item.id === ticketId)
    if (sourceTicket?.calledAt) updated.careTimings = recordCareStart(updated, 'recepcao', sourceTicket.issuedAt, user.id, new Date(sourceTicket.calledAt),user)
    const nextPatients = stored.map(item => item.id === patientId ? updated : item)
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
    addAuditLog({ action: 'senha_encaminhada', patientId, details: `Senha ${ticket.number} encaminhada ${intake.route==='sem_triagem'?'ao clínico, sem triagem (branca)':'à triagem'}.` })
    return { tickets: nextTickets, result: undefined }
  }), [user, users, hasPermission, mutateTickets, addAuditLog])

  const updateAttendance = useCallback((patientId:string,draft:IntakeDraft)=>mutateTickets(current=>{
    if(!user)throw new Error('Faça login para atualizar atendimentos.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]')
    const patient=stored.find(item=>item.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
    const updates=updateReceptionAttendance(patient,draft,user,users,current)
    const next=normalizePatient({...patient,...updates,ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id})
    const list=stored.map(item=>item.id===patientId?next:item);localStorage.setItem(PATIENTS_KEY,JSON.stringify(list));setPatients(list)
    const routed=updates.status?current.map(ticket=>ticket.patientId===patientId&&ticket.stage!=='concluida'?{...ticket,stage:draft.route==='sem_triagem'?'aguardando_clinico' as const:'aguardando_triagem' as const,clinicalAssignedTo:updates.triageAssignedClinicianId,clinicalQueuedAt:draft.route==='sem_triagem'?new Date().toISOString():undefined,calledBy:undefined,calledAt:undefined}:ticket):current
    addAuditLog({action:'atendimento_atualizado',patientId,details:`Atendimento atualizado: ${draft.route==='sem_triagem'?'sem triagem':'com triagem'}.`})
    return {tickets:routed,result:undefined}
  }),[user,users,mutateTickets,addAuditLog])

  const closeAttendance = useCallback(async(patientId:string,kind:'baixa'|'cancelamento',reason:string)=>{
    const close=()=>mutateTickets(current=>{
      if(!user)throw new Error('Faça login para encerrar atendimentos.')
      const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]');const patient=stored.find(item=>item.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
      if(user.role==='triagem'&&current.some(ticket=>ticket.patientId===patientId&&ticket.stage!=='concluida'&&(!['aguardando_triagem','ausente_triagem','chamada_triagem'].includes(ticket.stage)||ticket.stage==='chamada_triagem'&&ticket.calledBy!==user.id)))throw new Error('Este paciente já foi chamado por outro profissional ou iniciou o atendimento.')
      const updates=closeReceptionAttendance(patient,user,kind,reason);const next=normalizePatient({...patient,...updates,wardStays:patient.wardStays?.map(stay=>!stay.dischargedAt?{...stay,dischargedAt:updates.dischargeAt,dischargedBy:user.id,dischargedByName:user.name,dischargeKind:'encerramento_administrativo' as const,dischargeNotes:reason.trim()}:stay),medicalConsultations:patient.medicalConsultations?.map(record=>!record.endedAt?{...record,endedAt:updates.dischargeAt,outcome:'cancelada' as const,destination:reason.trim()}:record)});const list=stored.map(item=>item.id===patientId?next:item)
      localStorage.setItem(PATIENTS_KEY,JSON.stringify(list));setPatients(list)
      const requests:ExamRequest[]=JSON.parse(localStorage.getItem(EXAM_REQUESTS_KEY)||'[]');const nextRequests=requests.map(exam=>exam.patientId===patientId&&Date.parse(exam.solicitadoEm)>=Date.parse(patient.dataEntrada)&&!['concluido','cancelado'].includes(exam.status)?{...exam,status:'cancelado' as const}:exam);localStorage.setItem(EXAM_REQUESTS_KEY,JSON.stringify(nextRequests));setExamRequests(nextRequests)
      const orders:MedicationOrder[]=readMedicationOrders();const nextOrders=orders.map(order=>order.patientId===patientId&&Date.parse(order.requestedAt)>=Date.parse(patient.dataEntrada)&&order.status==='solicitada'?{...order,status:'cancelada' as const,cancelledReason:reason.trim()}:order);localStorage.setItem(MEDICATIONS_KEY,JSON.stringify(nextOrders));setMedicationOrders(nextOrders)
      addAuditLog({action:'atendimento_encerrado',patientId,details:`${kind==='cancelamento'?'Cancelamento':'Baixa administrativa'}: ${reason.trim()}`})
      return {tickets:current.map(ticket=>ticket.patientId===patientId&&ticket.stage!=='concluida'?{...ticket,stage:'concluida' as const,calledBy:undefined,calledAt:undefined}:ticket),result:undefined}
    })
    if(navigator.locks)await navigator.locks.request('medrisk-medications',close);else await close()
  },[user,mutateTickets,addAuditLog])


  const admitWard=useCallback((patientId:string,reason:string,bed:string)=>mutateTickets(current=>{
    if(!user||user.role!=='enfermaria')throw new Error('Sem permissão para entrada na enfermaria.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]');const patient=stored.find(p=>p.id===patientId)
    const sector=sectors.find(s=>s.id===(user.sectorId||'sector-enfermaria')&&s.active)
    if(!patient||!sector)throw new Error('Paciente ou setor indisponível.')
    if(current.some(ticket=>ticket.patientId===patientId&&['em_clinico','em_triagem'].includes(ticket.stage)))throw new Error('O paciente está em atendimento. Utilize o encaminhamento do profissional responsável.');
    const updates=wardAdmission(patient,user,sector,reason,bed);const list=stored.map(p=>p.id===patientId?normalizePatient({...p,...updates,ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id}):p)
    localStorage.setItem(PATIENTS_KEY,JSON.stringify(list));setPatients(list)
    addAuditLog({action:'enfermaria_entrada',patientId,details:reason.trim()})
    return {tickets:current.map(ticket=>ticket.patientId===patientId?{...ticket,stage:'concluida' as const,calledBy:undefined,calledAt:undefined}:ticket),result:undefined}
  }),[user,sectors,mutateTickets,addAuditLog])
  const recordWard=useCallback((patientId:string,draft:WardRecordDraft)=>mutateTickets(current=>{
    if(!user)throw new Error('Faça login para registrar.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]');const patient=stored.find(p=>p.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
    const updates=appendWardRecord(patient,user,draft);const list=stored.map(p=>p.id===patientId?normalizePatient({...p,...updates,ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id}):p)
    localStorage.setItem(PATIENTS_KEY,JSON.stringify(list));setPatients(list)
    addAuditLog({action:draft.kind==='sinais_vitais'?'enfermaria_sinais_vitais':draft.kind==='reavaliacao'?'enfermaria_reavaliacao':'enfermaria_observacao',patientId,details:'Registro de enfermaria: '+draft.kind})
    return {tickets:current,result:undefined}
  }),[user,mutateTickets,addAuditLog])
  const dischargeFromWard=useCallback(async(patientId:string,notes:string)=>{
    const finish=()=>mutateTickets(current=>{
      if(!user)throw new Error('Faça login para registrar a alta.')
      const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]');const patient=stored.find(p=>p.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
      const updates=dischargeWard(patient,user,notes);const list=stored.map(p=>p.id===patientId?normalizePatient({...p,...updates,ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id}):p)
      localStorage.setItem(PATIENTS_KEY,JSON.stringify(list));setPatients(list)
      addAuditLog({action:'enfermaria_alta',patientId,details:notes.trim()})
      const queued=current.map(ticket=>ticket.patientId===patientId?{...ticket,stage:updates.status==='aguardando_clinico'?'aguardando_clinico' as const:updates.status==='aguardando_triagem'?'aguardando_triagem' as const:'concluida' as const,clinicalAssignedTo:patient.triageAssignedClinicianId,clinicalQueuedAt:new Date().toISOString(),calledBy:undefined,calledAt:undefined}:ticket)
      return {tickets:ensureClinicalTickets(queued,list),result:undefined}
    })
    if(navigator.locks)await navigator.locks.request('medrisk-medications',finish);else await finish()
  },[user,mutateTickets,addAuditLog])
  const saveConsultation=useCallback((patientId:string,action:'start'|'save'|'finish',anamnesis?:string)=>mutateTickets(current=>{
    if(!user)throw new Error('Faça login para atender.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]')
    const patient=stored.find(p=>p.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
    if(action==='start'&&stored.some(p=>p.id!==patientId&&(p.medicalConsultations||[]).some(r=>r.physicianId===user.id&&!r.endedAt)))throw new Error('Finalize a consulta em andamento antes de iniciar outra.')
    if(action==='start'&&!current.some(t=>t.patientId===patientId&&t.calledBy===user.id&&['chamada_clinico','em_clinico','chamada_medico'].includes(t.stage))&&!(patient.medicalConsultations||[]).some(r=>r.physicianId===user.id&&r.encounterEntryAt===patient.dataEntrada&&!r.endedAt))throw new Error('Chame o paciente no painel antes de iniciar a consulta.')
    const records=consultation(patient,user,action,anamnesis)
    const completedRequests=action==='finish'?patient.assessmentRequests?.map(request=>request.specialty===user.role?{...request,status:'completed' as const}:request):patient.assessmentRequests
    const pendingExams=(JSON.parse(localStorage.getItem(EXAM_REQUESTS_KEY)||'[]') as ExamRequest[]).some(exam=>exam.patientId===patientId&&!['concluido','cancelado'].includes(exam.status)&&Date.parse(exam.solicitadoEm)>=Date.parse(patient.dataEntrada))
    const status=action==='finish'?nextAssessmentStatus({...patient,assessmentRequests:completedRequests},pendingExams?'aguardando_exames':'concluido'):patient.status
    const updated=normalizePatient({...patient,medicalConsultations:records,assessmentRequests:completedRequests,status,...(status==='concluido'?{dischargeAt:new Date().toISOString()}:{}),ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id})
    const next=stored.map(p=>p.id===patientId?updated:p);localStorage.setItem(PATIENTS_KEY,JSON.stringify(next));setPatients(next)
    if(action!=='start')addAuditLog({action:action==='finish'?'consulta_medica_finalizada':'consulta_medica_atualizada',patientId,details:action==='finish'?'Consulta médica finalizada.':'Anamnese da consulta salva.'})
    return {tickets:current.map(ticket=>ticket.patientId===patientId&&ticket.calledBy===user.id&&action==='start'&&ticket.stage==='chamada_clinico'?{...ticket,stage:'em_clinico' as const}:ticket.patientId===patientId&&ticket.calledBy===user.id&&action==='finish'?{...ticket,stage:'concluida' as const,calledBy:undefined,calledAt:undefined}:ticket),result:undefined}
  }),[user,mutateTickets,addAuditLog])
  const transferMedicalPatient=useCallback((patientId:string,draft:TransferDraft)=>mutateTickets(current=>{
    if(!user)throw new Error('Faça login para encaminhar.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]')
    const patient=stored.find(p=>p.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
    const updates=medicalTransfer(patient,user,draft,users,sectors)
    const updated=normalizePatient({...patient,...updates,ultimaAtualizacao:new Date().toISOString(),ultimoAtualizadoPor:user.id})
    const next=stored.map(p=>p.id===patientId?updated:p);localStorage.setItem(PATIENTS_KEY,JSON.stringify(next));setPatients(next)
    let ticket=current.find(ticket=>ticket.id===patient.ticketId)||[...current].reverse().find(ticket=>ticket.patientId===patientId)
    if(!ticket)ticket={...issueArrivalTicket(current,'comum'),patientId}
    const routed={...ticket,stage:updates.status==='aguardando_clinico'?'aguardando_clinico' as const:updates.status==='aguardando_triagem'?'aguardando_triagem' as const:'concluida' as const,clinicalAssignedTo:updates.triageAssignedClinicianId,clinicalQueuedAt:new Date().toISOString(),calledBy:undefined,calledAt:undefined,destination:undefined}
    addAuditLog({action:'paciente_encaminhado_medico',patientId,details:`Encaminhamento para ${sectors.find(s=>s.id===draft.sectorId)?.name}: ${draft.reason.trim()}`})
    return {tickets:[...current.filter(t=>t.id!==ticket!.id),routed],result:undefined}
  }),[user,users,sectors,mutateTickets,addAuditLog])
  const callMedicalPatient=useCallback((patientId:string)=>mutateTickets(current=>{
    if(!user)throw new Error('Faça login para chamar.')
    const stored:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]')
    const patient=stored.find(p=>p.id===patientId);if(!patient)throw new Error('Paciente não encontrado.')
    assertMedicalCare(patient,user)
    if(stored.some(p=>p.id!==patientId&&(p.medicalConsultations||[]).some(r=>r.physicianId===user.id&&!r.endedAt)))throw new Error('Finalize a consulta em andamento antes de chamar outro paciente.')
    if(!user.consultationRoom?.trim())throw new Error('Confirme seu consultório antes de chamar o paciente.')
    if(user.role==='clinico'){
      const ready=ensureClinicalTickets(current,stored);const ticket=ready.find(t=>t.patientId===patientId&&['aguardando_clinico','chamada_clinico','em_clinico'].includes(t.stage))
      if(!ticket)throw new Error('Esta consulta não está aguardando chamada na clínica.')
      if(ticket.stage==='em_clinico'&&ticket.calledBy===user.id)return {tickets:ready.map(t=>t.id===ticket.id?{...t,stage:'chamada_clinico' as const,calledAt:new Date().toISOString(),destination:user.consultationRoom}:t),result:undefined}
      const result=callArrivalTicket(ready,user,'clinico',ticket.id)
      return {tickets:result.tickets,result:undefined}
    }
    let ticket=[...current].reverse().find(t=>t.patientId===patientId)
    if(ticket&&ticket.stage!=='concluida'&&!(ticket.stage==='chamada_medico'&&ticket.calledBy===user.id))throw new Error('O paciente está em atendimento em outra etapa.')
    if(!ticket)ticket={...issueArrivalTicket(current,'comum'),patientId}
    const called={...ticket,stage:'chamada_medico' as const,calledBy:user.id,calledAt:new Date().toISOString(),destination:user.consultationRoom}
    return {tickets:[...current.filter(t=>t.id!==ticket!.id).map(t=>t.stage==='chamada_medico'&&t.calledBy===user.id?{...t,stage:'concluida' as const,calledBy:undefined,calledAt:undefined}:t),called],result:undefined}
  }),[user,mutateTickets])
  // Pacientes
  const getPatient = useCallback((id: string) => {
    return visiblePatients.find(p => p.id === id)
  }, [visiblePatients])

  const getPatientsByStatus = useCallback((status: PatientStatus | PatientStatus[]) => {
    const statusArray = Array.isArray(status) ? status : [status]
    return visiblePatients.filter(p => statusArray.includes(p.status))
  }, [visiblePatients])

  const createPatient = useCallback(async (patientData: Omit<Patient, 'id' | 'prontuario' | 'cadastradoEm' | 'ultimaAtualizacao' | 'ultimoAtualizadoPor'>) => {
    if (!user || !hasPermission('create_patient')) throw new Error('Sem permissão para cadastrar pacientes.')
    return mutateTickets(current => {
      const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
      if (patientData.cpf.replace(/\D/g, '') && stored.some(patient => patient.cpf.replace(/\D/g, '') === patientData.cpf.replace(/\D/g, ''))) throw new Error('Paciente já cadastrado. Vincule a senha ao cadastro existente.')
      if (user.role === 'recepcao' && !patientData.ticketId) throw new Error('Chame uma senha na recepção antes de cadastrar.')
      const ticket = current.find(item => item.id === patientData.ticketId)
      const id = generateId('patient')
      if (patientData.ticketId && !ticket) throw new Error('Senha não encontrada.')
      const directTicket = !ticket && user.role === 'triagem' ? issueArrivalTicket(current, 'comum') : undefined
      const nextTickets = ticket ? forwardArrivalTicket(current, ticket.id, id, user) : directTicket ? [...current, { ...directTicket, stage: 'aguardando_triagem' as const, patientId: id, forwardedAt: new Date().toISOString() }] : current
      const registration = cleanRegistration(registrationDraft(patientData as Patient), stored)
      const route = patientData.attendanceRoute || 'com_triagem'
      if (user.role === 'triagem' && route !== 'com_triagem') throw new Error('O cadastro da triagem deve seguir o fluxo de triagem.')
      const updates = intakeUpdates({complaint:patientData.queixaPrincipal||'',notes:patientData.descricaoInicial||'',route,doctorId:patientData.triageAssignedClinicianId||''}, users)
      const newPatient: Patient = normalizePatient({ ...patientData, ...registration, ...updates, ticketId: ticket?.id || directTicket?.id, ticketNumber: ticket?.number || directTicket?.number, id, prontuario: `PRONT-${new Date().getFullYear()}-${String(stored.length + 1).padStart(3, '0')}`, name: patientData.nomeCompleto, age: patientData.idade, cadastradoEm: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString(), updatedAt: new Date().toISOString(), ultimoAtualizadoPor: user.id })
      if (ticket?.calledAt) newPatient.careTimings = recordCareStart(newPatient, 'recepcao', ticket.issuedAt, user.id, new Date(ticket.calledAt),user)
      const nextPatients = [...stored, newPatient]
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
      addAuditLog({ patientId: id, action: 'cadastro_paciente', description: `Paciente ${newPatient.nomeCompleto} cadastrado${ticket ? ` com senha ${ticket.number}, ${route==='sem_triagem'?'sem triagem (branca)':'encaminhado à triagem'}` : ''}.` })
      const routedTickets = nextTickets.map(item=>item.patientId===id&&route==='sem_triagem'?{...item,stage:'aguardando_clinico' as const,clinicalAssignedTo:updates.triageAssignedClinicianId,clinicalQueuedAt:new Date().toISOString()}:item)
      return { tickets: routedTickets, result: newPatient }
    })
  }, [user, users, hasPermission, mutateTickets, addAuditLog])

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    if(user?.previewMode)throw new Error('Visualização de perfil: alterações não são permitidas.')
    const storedPatients:Patient[]=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]')
    const currentPatient = storedPatients.find(patient => patient.id === id) || patients.find(patient => patient.id === id)
    if(currentPatient?.attendanceClosure&&updates.status&&!['concluido','liberado','contraindicado'].includes(updates.status))throw new Error('O atendimento foi encerrado.')
    if (!currentPatient || !projectPatientForUser(currentPatient, user)) throw new Error('Paciente não direcionado para este profissional.')
    if (updates.triageData?.completedAt && user?.role === 'triagem') {
      void mutateTickets(current => ({ tickets: current.map(ticket => ticket.patientId === id && ['chamada_triagem', 'em_triagem'].includes(ticket.stage) && ticket.calledBy === user.id ? { ...ticket, stage: updates.status==='aguardando_clinico'?'aguardando_clinico' as const:'concluida' as const, clinicalAssignedTo: updates.status==='aguardando_clinico'?updates.triageAssignedClinicianId || currentPatient.triageAssignedClinicianId:undefined, clinicalQueuedAt: updates.triageData?.completedAt, calledBy: undefined, calledAt: undefined } : ticket), result: undefined }))
    }
    if(user&&((user.role==='cardiologista'&&updates.cardiologyAssessment?.completedAt)||(user.role==='anestesista'&&updates.anesthesiaAssessment?.completedAt)||(user.role==='cirurgiao'&&updates.surgicalRiskAssessment?.completedAt)))void mutateTickets(current=>({tickets:current.map(ticket=>ticket.patientId===id&&ticket.calledBy===user.id?{...ticket,stage:'concluida' as const,calledBy:undefined,calledAt:undefined}:ticket),result:undefined}))
    if (updates.clinicalEvaluation?.completedAt && user?.role === 'clinico') {
      void mutateTickets(current => ({ tickets: current.map(ticket => ticket.patientId === id && ['chamada_clinico', 'em_clinico'].includes(ticket.stage) && ticket.calledBy === user.id ? { ...ticket, stage: 'concluida' as const } : ticket), result: undefined }))
    }
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return normalizePatient({
          ...p,
          ...updates,
          medicalConsultations:(updates.medicalConsultations||p.medicalConsultations)?.map(record=>record.physicianId===user?.id&&!record.endedAt&&((user?.role==='clinico'&&updates.clinicalEvaluation?.completedAt)||(user?.role==='cardiologista'&&updates.cardiologyAssessment?.completedAt)||(user?.role==='anestesista'&&updates.anesthesiaAssessment?.completedAt)||(user?.role==='cirurgiao'&&updates.surgicalRiskAssessment?.completedAt))?{...record,endedAt:new Date().toISOString(),outcome:'finalizada' as const}:record),
          name: updates.nomeCompleto ?? p.name ?? p.nomeCompleto,
          age: updates.idade ?? p.age ?? p.idade,
          ultimaAtualizacao: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ultimoAtualizadoPor: user?.id || '',
        })
      }
      return p
    }))
  }, [user, patients, mutateTickets])

  const registerCareStart = useCallback((patientId: string) => {
    const patient = patients.find(item => item.id === patientId)
    if (!user || !patient || !isPatientAssignedToDoctor(patient, user)) return
    const sector = user.role
    const permission = sector === 'clinico' ? 'clinical_evaluation' : sector === 'cardiologista' ? 'classify_cardiac_risk' : sector === 'anestesista' ? 'classify_asa' : 'classify_risk'
    if (!hasPermission(permission)) return
    if (!['clinico', 'cardiologista', 'anestesista', 'cirurgiao'].includes(sector)) return
    const request = patient.assessmentRequests?.find(item => item.specialty === sector)
    const eligible = sector === 'clinico' ? ['aguardando_clinico', 'aguardando_avaliacao', 'em_avaliacao_clinica', 'exames_concluidos'].includes(patient.status)
      : ['aguardando_' + sector, sector === 'cardiologista' ? 'em_avaliacao_cardiologica' : sector === 'anestesista' ? 'em_avaliacao_anestesica' : 'em_avaliacao_cirurgica'].includes(patient.status) || hasPendingAssessment(patient, sector as 'cardiologista' | 'anestesista' | 'cirurgiao')
    if (!eligible) return
    const active = tickets.find(ticket => ticket.patientId === patient.id && ['chamada_clinico', 'em_clinico', 'aguardando_clinico'].includes(ticket.stage))
    const queuedAt = sector === 'clinico' ? active?.clinicalQueuedAt || patient.triageData?.completedAt
      : request?.requestedAt || (sector === 'cardiologista' ? patient.clinicalEvaluation?.completedAt : sector === 'anestesista' ? patient.cardiologyAssessment?.completedAt : patient.anesthesiaAssessment?.completedAt || patient.clinicalEvaluation?.completedAt)
    if (!queuedAt) return
    const next = recordCareStart(patient, sector as 'clinico' | 'cardiologista' | 'anestesista' | 'cirurgiao', queuedAt, user.id,new Date(),user)
    if (next === patient.careTimings || !next.length) return
    updatePatient(patientId, { careTimings: next })
  }, [patients, user, tickets, updatePatient, hasPermission])

  const updatePatientBasic = useCallback(async (id: string, draft: PatientBasicDraft) => {
    const updates = validatePatientBasicEdit(user, id, draft, patients)
    // Do not rehydrate clinical snapshots during a registration-only edit.
    setPatients((current) => current.map((patient) => patient.id === id ? {
      ...patient,
      ...updates,
      name: updates.nomeCompleto ?? patient.name,
      age: updates.idade ?? patient.age,
      ultimaAtualizacao: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ultimoAtualizadoPor: user?.id || '',
    } : patient))
    addAuditLog({ patientId: id, action: 'edicao_dados_basicos', description: 'Dados de cadastro e entrada atual atualizados.' })
  }, [user, patients, addAuditLog])

  const updatePatientStatus = useCallback((id: string, status: PatientStatus) => {
    const patient = patients.find(p => p.id === id)
    if (!patient) return

    updatePatient(id, { status })
    
    const actionMap: Record<PatientStatus, AuditAction> = {
      em_enfermaria:'enfermaria_entrada',
      aguardando_triagem: 'encaminhamento_triagem',
      em_triagem: 'encaminhamento_triagem',
      aguardando_avaliacao: 'encaminhamento_clinico',
      aguardando_clinico: 'encaminhamento_clinico',
      em_avaliacao_clinica: 'avaliacao_clinica',
      aguardando_exames: 'solicitacao_exame',
      aguardando_resultado: 'resultado_exame',
      exames_solicitados: 'solicitacao_exame',
      aguardando_laboratorio: 'encaminhamento_laboratorio',
      exames_em_analise: 'analise_exame',
      exames_concluidos: 'resultado_exame',
      aguardando_cardiologista: 'encaminhamento_cardiologia',
      em_avaliacao_cardiologica: 'avaliacao_cardiologica_atualizada',
      aguardando_anestesista: 'encaminhamento_anestesia',
      em_avaliacao_anestesica: 'avaliacao_anestesica_atualizada',
      aguardando_cirurgiao: 'encaminhamento_cirurgiao',
      em_avaliacao_cirurgica: 'calculo_score',
      concluido: 'classificacao_risco',
      liberado: 'liberacao_cirurgia',
      alto_risco: 'classificacao_risco',
      contraindicado: 'contraindicacao_cirurgia',
    }
    
    addAuditLog({
      patientId: id,
      action: actionMap[status],
      description: `Status alterado para: ${status}`,
      previousValue: patient.status,
      newValue: status,
    })
  }, [patients, updatePatient, addAuditLog])

  const registerVitalSigns = useCallback((id: string, vitalSigns: VitalSigns) => {
    const patient = patients.find(p => p.id === id)
    const isUpdate = !!patient?.sinaisVitais

    updatePatient(id, { sinaisVitais: vitalSigns })
    
    addAuditLog({
      patientId: id,
      action: isUpdate ? 'alteracao_sinais_vitais' : 'registro_sinais_vitais',
      description: `Sinais vitais ${isUpdate ? 'atualizados' : 'registrados'}: PA ${vitalSigns.pressaoSistolica}/${vitalSigns.pressaoDiastolica}, FC ${vitalSigns.frequenciaCardiaca}, Sat ${vitalSigns.saturacao}%`,
    })
  }, [patients, updatePatient, addAuditLog])

  const registerClinicalEvaluation = useCallback((id: string, evaluation: Omit<ClinicalEvaluation, 'id' | 'patientId'>) => {
    const fullEvaluation: ClinicalEvaluation = {
      ...evaluation,
      id: generateId('eval'),
      patientId: id,
    }
    
    updatePatient(id, { avaliacaoClinica: fullEvaluation })
    
    addAuditLog({
      patientId: id,
      action: 'avaliacao_clinica',
      description: `Avaliacao clinica realizada. Hipotese: ${evaluation.hipoteseDiagnostica}`,
    })
  }, [updatePatient, addAuditLog])

  const registerSurgicalEvaluation = useCallback((id: string, evaluation: Omit<SurgicalEvaluation, 'id' | 'patientId'>) => {
    const fullEvaluation: SurgicalEvaluation = {
      ...evaluation,
      id: generateId('surg'),
      patientId: id,
    }
    
    updatePatient(id, { avaliacaoCirurgica: fullEvaluation })
    
    // Determinar o status baseado no risco
    let newStatus: PatientStatus = 'em_avaliacao_cirurgica'
    if (evaluation.riscoFinal === 'baixo' || evaluation.riscoFinal === 'moderado') {
      newStatus = 'liberado'
    } else if (evaluation.riscoFinal === 'alto') {
      newStatus = 'alto_risco'
    } else if (evaluation.riscoFinal === 'contraindicado') {
      newStatus = 'contraindicado'
    }
    
    updatePatient(id, { status: newStatus })
    
    addAuditLog({
      patientId: id,
      action: 'classificacao_risco',
      description: `Risco classificado como ${(evaluation.riscoFinal || 'pendente').toUpperCase()}`,
    })
  }, [updatePatient, addAuditLog])

  // Exames
  const getExamRequestsByPatient = useCallback((patientId: string) => {
    return visibleExamRequests.filter(e => e.patientId === patientId)
  }, [visibleExamRequests])

  const getExamRequestsByStatus = useCallback((status: ExamStatus | ExamStatus[]) => {
    const statusArray = Array.isArray(status) ? status : [status]
    return visibleExamRequests.filter(e => statusArray.includes(e.status))
  }, [visibleExamRequests])

  const getPendingExams = useCallback(() => {
    return visibleExamRequests.filter(e => e.status !== 'concluido' && e.status !== 'cancelado')
  }, [visibleExamRequests])

  const createExamType = useCallback((examTypeData: Omit<ExamType, 'id' | 'createdAt'>) => {
    if (!user || !hasPermission('create_exam_type')) throw new Error('Sem permissão para cadastrar tipos de exames.')
    if (!examTypeData.name.trim() || !examTypeData.category.trim()) throw new Error('Informe nome e categoria do exame.')
    if (examTypeData.resultMode && !['single_file', 'multiple_images', 'individual'].includes(examTypeData.resultMode)) throw new Error('Formato de resultado inválido.')
    if (examTypeData.resultMode === 'multiple_images' && !examTypeData.category.toLowerCase().includes('imagem')) throw new Error('Selecione a categoria Imagem para múltiplas imagens.')
    validateExamConfiguration(examTypeData, undefined, user)
    const newExamType: ExamType = {
      ...examTypeData,
      name: examTypeData.name.trim(),
      createdBy: user.id,
      resultMode: examTypeData.resultMode || (examTypeData.category.toLowerCase().includes('imagem') ? 'multiple_images' : 'single_file'),
      id: generateId('exam'),
      createdAt: new Date().toISOString(),
    }
    
    setExamTypes(prev => [...prev, newExamType])
    
    addAuditLog({
      action: 'cadastro_exame',
      description: `Novo tipo de exame cadastrado: ${newExamType.name}`,
    })
    
    return newExamType
  }, [user, hasPermission, addAuditLog])

  const updateExamType = useCallback((id: string, draft: Partial<ExamType>) => {
    if (!user || !hasPermission('create_exam_type')) throw new Error('Sem permissão para gerenciar tipos de exames.')
    const previous = examTypes.find(exam => exam.id === id)
    if (!previous) throw new Error('Tipo de exame não encontrado.')
    const next = { ...previous, ...draft, id: previous.id, createdAt: previous.createdAt, createdBy: previous.createdBy }
    if (!next.name.trim() || !next.category.trim()) throw new Error('Informe nome e categoria do exame.')
    if (next.resultMode === 'multiple_images' && !next.category.toLowerCase().includes('imagem')) throw new Error('Múltiplas imagens exigem a categoria Imagem.')
    validateExamConfiguration(next, previous, user)
    setExamTypes(current => current.map(exam => exam.id === id ? next : exam))
    addAuditLog({action:'cadastro_exame',description:`Tipo de exame atualizado: ${next.name}`})
  }, [user, hasPermission, examTypes, addAuditLog])

  const requestExams = useCallback((patientId: string, examTypeIds: string[], justificativa: string) => {
    if (!user || !hasPermission('request_exams')) throw new Error('Sem permissão para solicitar exames.')
    if (!patients.some(patient => patient.id === patientId && isPatientAssignedToDoctor(patient, user))) throw new Error('Paciente não encontrado.')
    if (examTypeIds.some(id => examTypes.find(exam => exam.id === id)?.active === false)) throw new Error('Um dos tipos de exame está inativo.')
    if ((JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]') as Patient[]).find(p=>p.id===patientId)?.attendanceClosure) throw new Error('O atendimento foi encerrado.')
    if (!examTypeIds.length || new Set(examTypeIds).size !== examTypeIds.length || examTypeIds.some(id => !examTypes.some(exam => exam.id === id))) throw new Error('Selecione exames válidos.')
    const newRequests: ExamRequest[] = examTypeIds.map(examTypeId => {
      const examType = examTypes.find(e => e.id === examTypeId)
      return {
        id: generateId('req'),
        patientId,
        examTypeId,
        examTypeName: examType?.name || 'Exame desconhecido',
        examCategory: examType?.category,
        resultMode: examType?.resultMode || (examType?.category.toLowerCase().includes('imagem') ? 'multiple_images' : 'single_file'),
        status: 'solicitado' as ExamStatus,
        justificativa,
        valorReferencia: examType ? examReferenceForAge(examType, patientAgeAtRequest(patients.find(patient=>patient.id===patientId))) : undefined,
        solicitadoPor: user?.id || '',
        solicitadoEm: new Date().toISOString(),
      }
    })
    
    setExamRequests(prev => [...prev, ...newRequests])
    
    // Atualizar paciente
    const patient = patients.find(p => p.id === patientId)
    if (patient) {
      updatePatient(patientId, {
        examesSolicitados: [...patient.examesSolicitados, ...examTypeIds],
        status: 'exames_solicitados',
      })
    }
    
    const examNames = newRequests.map(r => r.examTypeName).join(', ')
    addAuditLog({
      patientId,
      action: 'solicitacao_exame',
      description: `Exames solicitados: ${examNames}`,
    })
  }, [examTypes, user, hasPermission, patients, updatePatient, addAuditLog])

  const updateExamStatus = useCallback((examId: string, status: ExamStatus, updates?: Partial<ExamRequest>) => {
    const exam = examRequests.find(e => e.id === examId)
    if (!exam) return

    if (!user) throw new Error('Faça login para registrar exames.')
    const type = examTypes.find(type => type.id === exam.examTypeId)
    const closedPatient:Patient|undefined=JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]').find((patient:Patient)=>patient.id===exam.patientId)
    if(closedPatient?.attendanceClosure&&Date.parse(exam.solicitadoEm)>=Date.parse(closedPatient.dataEntrada))throw new Error('O atendimento foi encerrado.')
    const next = applyExamOperation({ ...exam, examCategory: exam.examCategory || type?.category, resultMode: exam.resultMode || type?.resultMode || (type?.category.toLowerCase().includes('imagem') ? 'multiple_images' : 'single_file') }, status, updates || {}, user)
    setExamRequests(prev => prev.map(item => item.id === examId ? next : item))

    if (status === 'concluido') {
      const patient = patients.find(item => item.id === exam.patientId)
      const relevant = examRequests.map(item => item.id === examId ? next : item).filter(item => item.patientId === exam.patientId && (!patient?.ticketId || Date.parse(item.solicitadoEm) >= Date.parse(patient.dataEntrada)))
      if (patient && relevant.length > 0 && relevant.every(item => ['concluido', 'cancelado'].includes(item.status))) {
        updatePatient(patient.id, { status: nextAssessmentStatus(patient, 'exames_concluidos') })
      }
    }

    const actionMap: Record<ExamStatus, AuditAction> = {
      solicitado: 'solicitacao_exame',
      coletado: 'coleta_exame',
      em_analise: 'analise_exame',
      concluido: 'resultado_exame',
      cancelado: 'solicitacao_exame',
    }
    
    addAuditLog({
      patientId: exam.patientId,
      action: actionMap[status],
      description: `Exame ${exam.examTypeName}: status alterado para ${status}`,
      previousValue: exam.status,
      newValue: status,
    })
  }, [examRequests, examTypes, user, patients, updatePatient, addAuditLog])

  const createMedicalDocument = useCallback(async (patientId: string, draft: MedicalDocumentDraft) => {
    const patient = patients.find(item => item.id === patientId)
    if (!user || !patient || !isInitialized) throw new Error('Paciente indisponível.')
    const document = issueMedicalDocument(patient, draft, user)
    const save = () => {
      const stored: MedicalDocument[] = JSON.parse(localStorage.getItem(DOCUMENTS_KEY) || '[]')
      const next = [...stored, document]
      localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(next)); setMedicalDocuments(next)
    }
    if (navigator.locks) await navigator.locks.request('medrisk-medical-documents', save); else save()
    addAuditLog({ action: 'documento_medico_emitido', patientId, details: `${draft.kind} emitido por ${user.name}. Documento: ${document.id}` })
    return document
  }, [user, patients, isInitialized, addAuditLog])

  const changeMedications = useCallback(async (change: (orders: MedicationOrder[]) => MedicationOrder[] | Promise<MedicationOrder[]>, authoritativeAdministration=false) => {
    if(user?.previewMode)throw new Error('Visualização de perfil: alterações não são permitidas.')
    if (!isInitialized) throw new Error('Aguarde o carregamento.')
    const run = async () => {
      const orders: MedicationOrder[] = readMedicationOrders()
      const next = await change(orders)
      try {localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(next))}catch(error){if(!authoritativeAdministration)throw error}
      setMedicationOrders(next)
    }
    if (navigator.locks) await navigator.locks.request('medrisk-medications', run); else await run()
  }, [isInitialized,user?.previewMode])

  const prescribeMedicationOrder = useCallback(async (patientId: string, draft: MedicationDraft) => {
    if (!user || !patients.some(patient => patient.id === patientId && isPatientAssignedToDoctor(patient, user))) throw new Error('Paciente não encontrado.')
    const order = prescribeMedication(patientId, draft, user)
    await changeMedications(orders => {
      if((JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]') as Patient[]).find(p=>p.id===patientId)?.attendanceClosure)throw new Error('O atendimento foi encerrado.')
      return [...orders,order]
    })
    addAuditLog({ action: 'medicacao_solicitada', patientId, details: `Solicitada: ${order.medication} | ${order.dose} | ${order.route}` })
  }, [user, patients, changeMedications, addAuditLog])

  const recordMedicationAdministration = useCallback(async (id: string, at: string) => {
    if (!user) throw new Error('Faça login para registrar a administração.')
    let updated: MedicationOrder | undefined
    await changeMedications(async orders => {
      const order = orders.find(item => item.id === id)
      if (!order) throw new Error('Medicação não encontrada.')
      if(user.role==='enfermaria'){const patient=(JSON.parse(localStorage.getItem(PATIENTS_KEY)||'[]') as Patient[]).find(p=>p.id===order.patientId);if(!patient)throw new Error('Paciente não encontrado.');assertWardAccess(patient,user,'administer_medication');const stay=activeWardStay(patient)!;if(Math.floor(Date.parse(at)/1000)<Math.floor(Date.parse(stay.admittedAt)/1000))throw new Error('A administração deve ocorrer após a entrada na enfermaria.');if(!wardMedicationVisible(patient,order,user))throw new Error('Medicação não pertence a esta entrada hospitalar.')}
      updated = administerMedication(order, at, user)
      await pharmacyLock(()=>{writePharmacy(deductAdministeredMedication(readPharmacy(),updated!,user))})
      return orders.map(item => item.id === id ? updated! : item)
    }, true)
    addAuditLog({ action: 'medicacao_administrada', patientId: updated?.patientId, details: `${updated?.medication} administrada em ${updated?.administeredAt}.` })
  }, [user, changeMedications, addAuditLog])

  // Auditoria
  const getAuditLogsByPatient = useCallback((patientId: string) => {
    return visibleAuditLogs
      .filter(log => log.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [visibleAuditLogs])

  const getPatientById = useCallback((id: string) => {
    return getPatient(id)
  }, [getPatient])

  const getPatientAuditLogs = useCallback((patientId: string) => {
    return getAuditLogsByPatient(patientId)
  }, [getAuditLogsByPatient])

  // Estatisticas
  const getStats = useCallback(() => {
    return {
      totalPacientes: visiblePatients.length,
      aguardandoTriagem: visiblePatients.filter(p => p.status === 'aguardando_triagem').length,
      emAvaliacaoClinica: visiblePatients.filter(p => ['aguardando_clinico', 'em_avaliacao_clinica'].includes(p.status)).length,
      examesPendentes: visibleExamRequests.filter(e => e.status !== 'concluido' && e.status !== 'cancelado').length,
      aguardandoCardiologia: visiblePatients.filter(p => ['aguardando_cardiologista', 'em_avaliacao_cardiologica'].includes(p.status)).length,
      aguardandoAnestesia: visiblePatients.filter(p => ['aguardando_anestesista', 'em_avaliacao_anestesica'].includes(p.status)).length,
      aguardandoCirurgiao: visiblePatients.filter(p => ['aguardando_cirurgiao', 'em_avaliacao_cirurgica'].includes(p.status)).length,
      liberados: visiblePatients.filter(p => p.status === 'liberado').length,
      altoRisco: visiblePatients.filter(p => p.status === 'alto_risco').length,
      contraindicados: visiblePatients.filter(p => p.status === 'contraindicado').length,
    }
  }, [visiblePatients, visibleExamRequests])

  return (
    <DataContext.Provider value={{
      wardCandidates:user?.role==='enfermaria'&&hasProfilePermission('ward_admit')?patients.filter(patient=>!patient.attendanceClosure&&!['concluido','liberado','contraindicado','em_enfermaria'].includes(patient.status)&&!patient.wardStays?.some(stay=>!stay.dischargedAt)).map(patient=>({id:patient.id,nomeCompleto:patient.nomeCompleto,nomeSocial:patient.nomeSocial,prontuario:patient.prontuario,dataNascimento:patient.dataNascimento,idade:patient.idade,sexo:patient.sexo,cpf:patient.cpf,status:patient.status} as Patient)):[],admitWard,recordWard,dischargeFromWard,
      registerCareStart, updateAttendance, closeAttendance,
      medicalDocuments: hasPermission('view_clinical_data') ? medicalDocuments.filter(document => visibleIds.has(document.patientId)&&(user?.role!=='enfermaria'||Boolean(patients.find(p=>p.id===document.patientId)&&wardDateVisible(patients.find(p=>p.id===document.patientId)!,document.issuedAt,user)))) : [],
      consultations:(hasPermission('medical_consultation')||hasPermission('view_medical_reports'))?patients.flatMap(patient=>(patient.medicalConsultations||[]).filter(record=>record.physicianId===user?.id)):[],saveConsultation,transferMedicalPatient,callMedicalPatient,
      createMedicalDocument,
      medicationOrders: hasUserPermission(user?.previewMode?{...user,previewMode:false}:user,'manage_pharmacy') || hasPermission('view_clinical_data') || hasPermission('administer_medication') ? medicationOrders.filter(order => visibleIds.has(order.patientId)&&(user?.role!=='enfermaria'||Boolean(patients.find(p=>p.id===order.patientId)&&wardMedicationVisible(patients.find(p=>p.id===order.patientId)!,order,user)))) : [],
      prescribeMedicationOrder, recordMedicationAdministration,
      isDataReady: isInitialized,
      publicCalls: tickets.filter(ticket => ['chamada_recepcao', 'chamada_triagem', 'chamada_clinico','chamada_medico'].includes(ticket.stage)).map(({number, stage, category, calledAt, day, destination}) => ({number, stage, category, calledAt, day, destination})),
      tickets: user?.role==='admin'&&hasPermission('view_reports')||hasProfilePermission('manage_reception_queue') || hasProfilePermission('call_triage_ticket') ? tickets : hasProfilePermission('clinical_evaluation') ? ensureClinicalTickets(tickets, patients).filter(ticket => ticket.clinicalAssignedTo === user?.id) : [],
      issueTicket, callTicket, markTicketAbsent, beginTicketTriage, beginTicketClinical, forwardExistingPatient,
      patients: visiblePatients,
      getPatient,
      getPatientById,
      getPatientsByStatus,
      createPatient,
      updatePatient,
      updatePatientBasic,
      updatePatientStatus,
      registerVitalSigns,
      registerClinicalEvaluation,
      registerSurgicalEvaluation,
      examTypes: hasPermission('view_exam_results') ? examTypes : [],
      examRequests: visibleExamRequests,
      getExamRequestsByPatient,
      getExamRequestsByStatus,
      getPendingExams,
      createExamType, updateExamType,
      requestExams,
      updateExamStatus,
      auditLogs: visibleAuditLogs,
      getAuditLogsByPatient,
      getPatientAuditLogs,
      addAuditLog,
      getStats,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
