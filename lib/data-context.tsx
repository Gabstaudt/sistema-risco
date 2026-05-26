'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { Patient, PatientStatus, Priority, VitalSigns, ClinicalEvaluation, SurgicalEvaluation, AuditLog, AuditAction, ExamRequest, ExamType, ExamStatus } from './types'
import { patients as initialPatients, examRequests as initialExamRequests } from './data/patients'
import { examTypes as initialExamTypes } from './data/exams'
import { auditLogs as initialAuditLogs } from './data/audit'
import { useAuth } from './auth'

interface DataContextType {
  // Pacientes
  patients: Patient[]
  getPatient: (id: string) => Patient | undefined
  getPatientById: (id: string) => Patient | undefined
  getPatientsByStatus: (status: PatientStatus | PatientStatus[]) => Patient[]
  createPatient: (patient: Omit<Patient, 'id' | 'prontuario' | 'cadastradoEm' | 'ultimaAtualizacao' | 'ultimoAtualizadoPor'>) => Patient
  updatePatient: (id: string, updates: Partial<Patient>) => void
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

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [examTypes, setExamTypes] = useState<ExamType[]>([])
  const [examRequests, setExamRequests] = useState<ExamRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Carregar dados do localStorage ou usar dados iniciais
  useEffect(() => {
    const savedPatients = localStorage.getItem(PATIENTS_KEY)
    const savedExamTypes = localStorage.getItem(EXAM_TYPES_KEY)
    const savedExamRequests = localStorage.getItem(EXAM_REQUESTS_KEY)
    const savedAudit = localStorage.getItem(AUDIT_KEY)

    setPatients(savedPatients ? JSON.parse(savedPatients) : initialPatients)
    setExamTypes(savedExamTypes ? JSON.parse(savedExamTypes) : initialExamTypes)
    setExamRequests(savedExamRequests ? JSON.parse(savedExamRequests) : initialExamRequests)
    setAuditLogs(savedAudit ? JSON.parse(savedAudit) : initialAuditLogs)
    setIsInitialized(true)
  }, [])

  // Persistir dados no localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients))
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

  // Pacientes
  const getPatient = useCallback((id: string) => {
    return patients.find(p => p.id === id)
  }, [patients])

  const getPatientsByStatus = useCallback((status: PatientStatus | PatientStatus[]) => {
    const statusArray = Array.isArray(status) ? status : [status]
    return patients.filter(p => statusArray.includes(p.status))
  }, [patients])

  const createPatient = useCallback((patientData: Omit<Patient, 'id' | 'prontuario' | 'cadastradoEm' | 'ultimaAtualizacao' | 'ultimoAtualizadoPor'>) => {
    const newPatient: Patient = {
      ...patientData,
      id: generateId('patient'),
      prontuario: `PRONT-${new Date().getFullYear()}-${String(patients.length + 1).padStart(3, '0')}`,
      name: patientData.nomeCompleto,
      age: patientData.idade,
      cadastradoEm: new Date().toISOString(),
      ultimaAtualizacao: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ultimoAtualizadoPor: user?.id || '',
    }
    
    setPatients(prev => [...prev, newPatient])
    
    addAuditLog({
      patientId: newPatient.id,
      action: 'cadastro_paciente',
      description: `Paciente ${newPatient.nomeCompleto} cadastrado no sistema`,
    })
    
    return newPatient
  }, [patients.length, user?.id, addAuditLog])

  const updatePatient = useCallback((id: string, updates: Partial<Patient>) => {
    setPatients(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          name: updates.nomeCompleto ?? p.name ?? p.nomeCompleto,
          age: updates.idade ?? p.age ?? p.idade,
          ultimaAtualizacao: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ultimoAtualizadoPor: user?.id || '',
        }
      }
      return p
    }))
  }, [user?.id])

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
      description: `Risco classificado como ${evaluation.riscoFinal.toUpperCase()}`,
    })
  }, [updatePatient, addAuditLog])

  // Exames
  const getExamRequestsByPatient = useCallback((patientId: string) => {
    return examRequests.filter(e => e.patientId === patientId)
  }, [examRequests])

  const getExamRequestsByStatus = useCallback((status: ExamStatus | ExamStatus[]) => {
    const statusArray = Array.isArray(status) ? status : [status]
    return examRequests.filter(e => statusArray.includes(e.status))
  }, [examRequests])

  const getPendingExams = useCallback(() => {
    return examRequests.filter(e => e.status !== 'concluido' && e.status !== 'cancelado')
  }, [examRequests])

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
    return auditLogs
      .filter(log => log.patientId === patientId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [auditLogs])

  const getPatientById = useCallback((id: string) => {
    return getPatient(id)
  }, [getPatient])

  const getPatientAuditLogs = useCallback((patientId: string) => {
    return getAuditLogsByPatient(patientId)
  }, [getAuditLogsByPatient])

  // Estatisticas
  const getStats = useCallback(() => {
    return {
      totalPacientes: patients.length,
      aguardandoTriagem: patients.filter(p => p.status === 'aguardando_triagem').length,
      emAvaliacaoClinica: patients.filter(p => ['aguardando_clinico', 'em_avaliacao_clinica'].includes(p.status)).length,
      examesPendentes: examRequests.filter(e => e.status !== 'concluido' && e.status !== 'cancelado').length,
      aguardandoCirurgiao: patients.filter(p => ['aguardando_cirurgiao', 'em_avaliacao_cirurgica'].includes(p.status)).length,
      liberados: patients.filter(p => p.status === 'liberado').length,
      altoRisco: patients.filter(p => p.status === 'alto_risco').length,
      contraindicados: patients.filter(p => p.status === 'contraindicado').length,
    }
  }, [patients, examRequests])

  return (
    <DataContext.Provider value={{
      patients,
      getPatient,
      getPatientById,
      getPatientsByStatus,
      createPatient,
      updatePatient,
      updatePatientStatus,
      registerVitalSigns,
      registerClinicalEvaluation,
      registerSurgicalEvaluation,
      examTypes,
      examRequests,
      getExamRequestsByPatient,
      getExamRequestsByStatus,
      getPendingExams,
      createExamType,
      requestExams,
      updateExamStatus,
      auditLogs,
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
