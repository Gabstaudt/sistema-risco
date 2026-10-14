'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { Patient, PatientStatus, Priority, VitalSigns, ClinicalEvaluation, SurgicalEvaluation, AuditLog, AuditAction, ExamRequest, ExamType, ExamStatus } from './types'
import { patients as initialPatients, examRequests as initialExamRequests, hydratePatient } from './data/patients'
import { examTypes as initialExamTypes } from './data/exams'
import { auditLogs as initialAuditLogs } from './data/audit'
import { useAuth } from './auth'
import { projectPatientForUser } from './permissions'
import { issueArrivalTicket, callArrivalTicket, forwardArrivalTicket, seedArrivalTickets, markTicketAttendance, type ArrivalTicket, type TicketCategory } from './tickets'
import { validatePatientBasicEdit, type PatientBasicDraft } from './patient-basic-edit'

interface DataContextType {
  isDataReady: boolean
  tickets: ArrivalTicket[]
  publicCalls: Pick<ArrivalTicket, 'number' | 'stage' | 'category' | 'calledAt' | 'day'>[]
  markTicketAbsent: (id: string, restore?: boolean) => Promise<void>
  issueTicket: (category: TicketCategory) => Promise<ArrivalTicket>
  callTicket: (stage: 'recepcao' | 'triagem', id?: string) => Promise<ArrivalTicket>
  beginTicketTriage: (id: string) => Promise<string>
  forwardExistingPatient: (ticketId: string, patientId: string, intake: { complaint: string; notes: string }) => Promise<void>
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
  
  // Exames
  examTypes: ExamType[]
  examRequests: ExamRequest[]
  getExamRequestsByPatient: (patientId: string) => ExamRequest[]
  getExamRequestsByStatus: (status: ExamStatus | ExamStatus[]) => ExamRequest[]
  getPendingExams: () => ExamRequest[]
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

const normalizePatient = (patient: Patient) => hydratePatient(patient)
const normalizePatients = (items: Patient[]) => items.map(normalizePatient)

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, hasPermission } = useAuth()
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
  const visibleExamRequests = hasPermission('view_exam_results') ? examRequests : []
  const visibleAuditLogs = hasPermission('view_patient_audit') ? auditLogs : []

  // Carregar dados do localStorage ou usar dados iniciais
  useEffect(() => {
    const savedPatients = localStorage.getItem(PATIENTS_KEY)
    const savedExamTypes = localStorage.getItem(EXAM_TYPES_KEY)
    const savedExamRequests = localStorage.getItem(EXAM_REQUESTS_KEY)
    const savedAudit = localStorage.getItem(AUDIT_KEY)

    if (savedPatients) {
      const saved: Patient[] = JSON.parse(savedPatients)
      const merged = saved.map((patient) => {
        const seed = initialPatients.find((item) => item.id === patient.id)
        const existing = patient.visitHistory || []
        const missingVisits = (seed?.visitHistory || []).filter((visit) =>
          visit.id !== `${patient.id}-visit-current` && !existing.some((item) => item.id === visit.id))
        return { ...patient, visitHistory: [...existing, ...missingVisits] }
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
    const loadedTickets: ArrivalTicket[] = storedTickets ? JSON.parse(storedTickets) : seedArrivalTickets(ticketPatients)
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
    if (!user) return
    
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
      if (event.key === TICKETS_KEY && event.newValue) setTickets(JSON.parse(event.newValue))
      if (event.key === PATIENTS_KEY && event.newValue) setPatients(normalizePatients(JSON.parse(event.newValue)))
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const mutateTickets = useCallback(async <T,>(change: (current: ArrivalTicket[]) => { tickets: ArrivalTicket[]; result: T }): Promise<T> => {
    if (!isInitialized) throw new Error('Aguarde o carregamento da fila.')
    const run = () => {
      const current: ArrivalTicket[] = JSON.parse(localStorage.getItem(TICKETS_KEY) || '[]')
      const next = change(current)
      localStorage.setItem(TICKETS_KEY, JSON.stringify(next.tickets))
      setTickets(next.tickets)
      return next.result
    }
    return navigator.locks ? navigator.locks.request('medrisk-ticket-flow', run) : run()
  }, [isInitialized])

  const issueTicket = useCallback((category: TicketCategory) => mutateTickets(current => {
    const ticket = issueArrivalTicket(current, category)
    return { tickets: [...current, ticket], result: ticket }
  }), [mutateTickets])

  const callTicket = useCallback(async (stage: 'recepcao' | 'triagem', id?: string) => {
    if (!user) throw new Error('Faça login para chamar senhas.')
    const ticket = await mutateTickets(current => {
      const next = callArrivalTicket(current, user, stage, id)
      return { tickets: next.tickets, result: next.ticket }
    })
    addAuditLog({ action: 'senha_chamada', patientId: ticket.patientId, details: `Senha ${ticket.number} chamada na ${stage}.` })
    return ticket
  }, [user, mutateTickets, addAuditLog])

  const markTicketAbsent = useCallback(async (id: string, restore = false) => {
    if (!user) throw new Error('Faça login para atualizar a fila.')
    await mutateTickets(current => ({ tickets: markTicketAttendance(current, id, user, restore), result: undefined }))
    addAuditLog({ action: restore ? 'senha_retornada' : 'senha_ausente', details: `Senha ${tickets.find(ticket => ticket.id === id)?.number || id}: ${restore ? 'retornada à fila' : 'não compareceu'}.` })
  }, [user, tickets, mutateTickets, addAuditLog])

  const beginTicketTriage = useCallback((id: string) => mutateTickets(current => {
    const ticket = current.find(item => item.id === id)
    if (!user || user.role !== 'triagem' || !hasPermission('call_triage_ticket') || !ticket?.patientId || !['chamada_triagem', 'em_triagem'].includes(ticket.stage) || ticket.calledBy !== user.id) throw new Error('Chame a senha antes de iniciar a triagem.')
    const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
    const nextPatients = stored.map(patient => patient.id === ticket.patientId ? { ...patient, status: 'em_triagem' as const } : patient)
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
    return { tickets: current.map(item => item.id === id ? { ...item, stage: 'em_triagem' as const } : item), result: ticket.patientId }
  }), [user, hasPermission, mutateTickets])

  const forwardExistingPatient = useCallback((ticketId: string, patientId: string, intake: { complaint: string; notes: string }) => mutateTickets(current => {
    if (!user) throw new Error('Faça login para encaminhar pacientes.')
    if (!intake.complaint.trim()) throw new Error('Informe as queixas para registrar a entrada.')
    const stored: Patient[] = JSON.parse(localStorage.getItem(PATIENTS_KEY) || '[]')
    const patient = stored.find(item => item.id === patientId)
    if (!patient) throw new Error('Paciente não encontrado.')
    if (!['concluido', 'liberado', 'contraindicado'].includes(patient.status)) throw new Error('Este paciente já possui um atendimento em andamento.')
    const nextTickets = forwardArrivalTicket(current, ticketId, patientId, user)
    const ticket = nextTickets.find(item => item.id === ticketId)!
    const previous = patient.visitHistory || []
    const currentVisit = previous.find(item => item.id === `${patient.id}-visit-current`)
    const archived = currentVisit ? { ...currentVisit, id: `${patient.id}-visit-${crypto.randomUUID()}`, dischargeAt: currentVisit.dischargeAt || patient.dischargeAt || patient.ultimaAtualizacao, clinicalSnapshot: { triageData: patient.triageData, examResults: patient.examResults, avaliacaoClinica: patient.avaliacaoClinica, avaliacaoCirurgica: patient.avaliacaoCirurgica, clinicalEvaluation: patient.clinicalEvaluation, cardiologyAssessment: patient.cardiologyAssessment, anesthesiaAssessment: patient.anesthesiaAssessment, surgicalRiskAssessment: patient.surgicalRiskAssessment } } : undefined
    const updated = normalizePatient({ ...patient, ticketId, ticketNumber: ticket.number, status: 'aguardando_triagem', dataEntrada: new Date().toISOString(), dischargeAt: undefined,
      triageData: undefined, sinaisVitais: undefined, triageRiskClassification: undefined, observacoesTriagem: undefined, clinicalEvaluation: undefined, avaliacaoClinica: undefined, cardiologyAssessment: undefined, anesthesiaAssessment: undefined, surgicalRiskAssessment: undefined, avaliacaoCirurgica: undefined, riskLevel: undefined, assessmentRequests: undefined, surgicalRiskRequest: undefined, clinicalRequestsSurgicalRisk: false, clinicalAssignedCardiologistId: undefined, clinicalAssignedCardiologistName: undefined, cardiologyAssignedAnesthesiologistId: undefined, cardiologyAssignedAnesthesiologistName: undefined, clinicalAssignedSurgeonId: undefined, clinicalAssignedSurgeonName: undefined, triageAssignedClinicianId: undefined, triageAssignedClinicianName: undefined, labRiskClassification: undefined, labRiskNotes: undefined, labNurseObservation: undefined, queixaPrincipal: intake.complaint.trim(), descricaoInicial: intake.notes.trim(), prioridade: 'normal', examesSolicitados: [], examResults: undefined,
      visitHistory: [...previous.filter(item => item.id !== `${patient.id}-visit-current`), ...(archived ? [archived] : [])] })
    const nextPatients = stored.map(item => item.id === patientId ? updated : item)
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
    addAuditLog({ action: 'senha_encaminhada', patientId, details: `Senha ${ticket.number} encaminhada à triagem.` })
    return { tickets: nextTickets, result: undefined }
  }), [user, mutateTickets, addAuditLog])

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
      if (stored.some(patient => patient.cpf.replace(/\D/g, '') === patientData.cpf.replace(/\D/g, ''))) throw new Error('Paciente já cadastrado. Vincule a senha ao cadastro existente.')
      if (user.role === 'recepcao' && !patientData.ticketId) throw new Error('Chame uma senha na recepção antes de cadastrar.')
      const ticket = current.find(item => item.id === patientData.ticketId)
      const id = generateId('patient')
      if (patientData.ticketId && !ticket) throw new Error('Senha não encontrada.')
      const directTicket = !ticket && user.role === 'triagem' ? issueArrivalTicket(current, 'comum') : undefined
      const nextTickets = ticket ? forwardArrivalTicket(current, ticket.id, id, user) : directTicket ? [...current, { ...directTicket, stage: 'aguardando_triagem' as const, patientId: id, forwardedAt: new Date().toISOString() }] : current
      const newPatient: Patient = normalizePatient({ ...patientData, ticketId: ticket?.id || directTicket?.id, ticketNumber: ticket?.number || directTicket?.number, id, prontuario: `PRONT-${new Date().getFullYear()}-${String(stored.length + 1).padStart(3, '0')}`, name: patientData.nomeCompleto, age: patientData.idade, cadastradoEm: new Date().toISOString(), ultimaAtualizacao: new Date().toISOString(), updatedAt: new Date().toISOString(), ultimoAtualizadoPor: user.id })
      const nextPatients = [...stored, newPatient]
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(nextPatients)); setPatients(nextPatients)
      addAuditLog({ patientId: id, action: 'cadastro_paciente', description: `Paciente ${newPatient.nomeCompleto} cadastrado${ticket ? ` com senha ${ticket.number}, encaminhado à triagem` : ''}.` })
      return { tickets: nextTickets, result: newPatient }
    })
  }, [user, hasPermission, mutateTickets, addAuditLog])

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    if (updates.triageData?.completedAt && user?.role === 'triagem') {
      void mutateTickets(current => ({ tickets: current.map(ticket => ticket.patientId === id && ['chamada_triagem', 'em_triagem'].includes(ticket.stage) && ticket.calledBy === user.id ? { ...ticket, stage: 'concluida' as const } : ticket), result: undefined }))
    }
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return normalizePatient({
          ...p,
          ...updates,
          name: updates.nomeCompleto ?? p.name ?? p.nomeCompleto,
          age: updates.idade ?? p.age ?? p.idade,
          ultimaAtualizacao: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ultimoAtualizadoPor: user?.id || '',
        })
      }
      return p
    }))
  }, [user?.id, user?.role, mutateTickets])

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
    const newExamType: ExamType = {
      ...examTypeData,
      id: generateId('exam'),
      createdAt: new Date().toISOString(),
    }
    
    setExamTypes(prev => [...prev, newExamType])
    
    addAuditLog({
      action: 'cadastro_exame',
      description: `Novo tipo de exame cadastrado: ${newExamType.name}`,
    })
    
    return newExamType
  }, [addAuditLog])

  const requestExams = useCallback((patientId: string, examTypeIds: string[], justificativa: string) => {
    const newRequests: ExamRequest[] = examTypeIds.map(examTypeId => {
      const examType = examTypes.find(e => e.id === examTypeId)
      return {
        id: generateId('req'),
        patientId,
        examTypeId,
        examTypeName: examType?.name || 'Exame desconhecido',
        status: 'solicitado' as ExamStatus,
        justificativa,
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
  }, [examTypes, user?.id, patients, updatePatient, addAuditLog])

  const updateExamStatus = useCallback((examId: string, status: ExamStatus, updates?: Partial<ExamRequest>) => {
    const exam = examRequests.find(e => e.id === examId)
    if (!exam) return

    setExamRequests(prev => prev.map(e => {
      if (e.id === examId) {
        const updated: ExamRequest = {
          ...e,
          status,
          ...updates,
        }
        
        // Adicionar timestamps baseado no status
        if (status === 'coletado' && !updated.coletadoPor) {
          updated.coletadoPor = user?.id
          updated.coletadoEm = new Date().toISOString()
        }
        if (status === 'em_analise' && !updated.analisadoPor) {
          updated.analisadoPor = user?.id
          updated.analisadoEm = new Date().toISOString()
        }
        if (status === 'concluido' && !updated.concluidoPor) {
          updated.concluidoPor = user?.id
          updated.concluidoEm = new Date().toISOString()
        }
        
        return updated
      }
      return e
    }))
    
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
  }, [examRequests, user?.id, addAuditLog])

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
      isDataReady: isInitialized,
      publicCalls: tickets.filter(ticket => ['chamada_recepcao', 'chamada_triagem', 'em_triagem'].includes(ticket.stage)).map(({number, stage, category, calledAt, day}) => ({number, stage, category, calledAt, day})),
      tickets: hasPermission('manage_reception_queue') || hasPermission('call_triage_ticket') ? tickets : [],
      issueTicket, callTicket, markTicketAbsent, beginTicketTriage, forwardExistingPatient,
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
      createExamType,
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
