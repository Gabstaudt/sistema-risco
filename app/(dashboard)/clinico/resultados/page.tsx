'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { PatientExamsHistory } from '@/components/shared/patient-exams-history'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useData } from '@/lib/data-context'
import { Search } from 'lucide-react'

export default function ClinicoResultadosPage() {
  const { patients, examRequests, examTypes } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const patientMap = useMemo(
    () =>
      Object.fromEntries(
        patients.map((patient) => [
          patient.id,
          {
            id: patient.id,
            nomeCompleto: patient.nomeCompleto,
            prontuario: patient.prontuario,
            status: patient.status,
          },
        ]),
      ),
    [patients],
  )

  const categories = useMemo(() => [...new Set(examTypes.map((exam) => exam.category))].sort(), [examTypes])

  const filteredRequests = useMemo(() => {
    const searchLower = search.toLowerCase()

    return [...examRequests]
      .filter((exam) => {
        const patient = patientMap[exam.patientId]
        const examCategory = examTypes.find((item) => item.id === exam.examTypeId)?.category
        const combinedText = [
          exam.examTypeName,
          exam.resultado,
          exam.labAnalysis,
          exam.observacoesLab,
          patient?.nomeCompleto,
          patient?.prontuario,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        const matchesSearch = search === '' || combinedText.includes(searchLower)
        const matchesStatus = statusFilter === 'all' || exam.status === statusFilter
        const matchesCategory = categoryFilter === 'all' || examCategory === categoryFilter

        return matchesSearch && matchesStatus && matchesCategory
      })
      .sort((a, b) => {
        const left = a.concluidoEm || a.analisadoEm || a.coletadoEm || a.solicitadoEm
        const right = b.concluidoEm || b.analisadoEm || b.coletadoEm || b.solicitadoEm
        return new Date(right).getTime() - new Date(left).getTime()
      })
  }, [categoryFilter, examRequests, examTypes, patientMap, search, statusFilter])

  const concludedCount = filteredRequests.filter((exam) => exam.status === 'concluido').length
  const pendingCount = filteredRequests.filter((exam) => exam.status !== 'concluido' && exam.status !== 'cancelado').length
  const criticalCount = filteredRequests.filter((exam) => exam.labUrgency === 'emergente' || exam.labUrgency === 'muito_urgente').length

  return (
    <>
      <Header breadcrumbs={[{ label: 'Resultados de Exames' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Resultados de Exames</h1>
          <p className="max-w-3xl text-muted-foreground">
            Consulta global dos exames de qualquer paciente, com leitura do resultado e acesso rapido ao prontuario.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total filtrado</p>
              <p className="mt-1 text-2xl font-semibold">{filteredRequests.length}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Concluidos</p>
              <p className="mt-1 text-2xl font-semibold">{concludedCount}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Alta prioridade</p>
              <p className="mt-1 text-2xl font-semibold">{criticalCount}</p>
              <p className="text-sm text-muted-foreground">{pendingCount} ainda em fluxo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, prontuario, exame ou resultado..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full xl:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="solicitado">Solicitado</SelectItem>
                    <SelectItem value="coletado">Coletado</SelectItem>
                    <SelectItem value="em_analise">Em analise</SelectItem>
                    <SelectItem value="concluido">Concluido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full xl:w-[220px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <PatientExamsHistory
          examRequests={filteredRequests}
          patientsById={patientMap}
          description="Historico consolidado de exames com resultado, interpretacao laboratorial e atalho para abrir o paciente."
          emptyMessage="Nenhum exame corresponde aos filtros aplicados."
          patientLinkBuilder={(patientId) => `/paciente/${patientId}`}
          actionLabel="Abrir prontuario"
        />
      </div>
    </>
  )
}
