'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/badges'
import { Search, Eye, UserPlus, LogIn, Calendar, X } from 'lucide-react'
import type { Patient, PatientStatus } from '@/lib/types'

const activeCareStatuses: PatientStatus[] = [
  'aguardando_triagem',
  'em_triagem',
  'aguardando_avaliacao',
  'aguardando_clinico',
  'em_avaliacao_clinica',
  'aguardando_exames',
  'aguardando_resultado',
  'exames_solicitados',
  'aguardando_laboratorio',
  'exames_em_analise',
  'exames_concluidos',
  'aguardando_cardiologista',
  'em_avaliacao_cardiologica',
  'aguardando_anestesista',
  'em_avaliacao_anestesica',
  'aguardando_cirurgiao',
  'em_avaliacao_cirurgica',
]

type IntakeFormState = {
  queixaPrincipal: string
  descricaoInicial: string
}

export default function PacientesPage() {
  const { patients, updatePatient } = useData()
  const { user, hasPermission } = useAuth()
  const canRegisterIntake = hasPermission('forward_to_triage')
  const baseUrl = user?.role === 'triagem' ? '/triagem' : '/recepcao'

  const [search, setSearch] = useState('')
  const [careFilter, setCareFilter] = useState<'all' | 'active' | 'available'>('all')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>({
    queixaPrincipal: '',
    descricaoInicial: '',
  })

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const searchLower = search.trim().toLocaleLowerCase('pt-BR')
        const cpfDigits = search.replace(/\D/g, '')
        const matchesSearch =
          !searchLower ||
          patient.nomeCompleto.toLocaleLowerCase('pt-BR').includes(searchLower) ||
          patient.prontuario.toLocaleLowerCase('pt-BR').includes(searchLower) ||
          (cpfDigits.length > 0 && patient.cpf.replace(/\D/g, '').includes(cpfDigits))
        const active = activeCareStatuses.includes(patient.status)
        const matchesCare = careFilter === 'all' || (careFilter === 'active' ? active : !active)
        return matchesSearch && matchesCare
      })
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
  }, [patients, search, careFilter])

  const canCheckIn = (patient: Patient) => !activeCareStatuses.includes(patient.status)

  const openIntake = (patient: Patient) => {
    setSelectedPatient(patient)
    setIntakeForm({
      queixaPrincipal: patient.queixaPrincipal || '',
      descricaoInicial: patient.descricaoInicial || '',
    })
  }

  const closeIntake = () => {
    setSelectedPatient(null)
    setIntakeForm({
      queixaPrincipal: '',
      descricaoInicial: '',
    })
  }

  const handleCheckIn = () => {
    if (!canRegisterIntake || !selectedPatient || !intakeForm.queixaPrincipal.trim()) {
      return
    }

    updatePatient(selectedPatient.id, {
      dataEntrada: new Date().toISOString(),
      status: 'aguardando_triagem',
      prioridade: 'normal',
      queixaPrincipal: intakeForm.queixaPrincipal.trim(),
      descricaoInicial: intakeForm.descricaoInicial.trim(),
    })

    closeIntake()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Pacientes' }]} />
      <div className="w-full min-w-0 flex-1 space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
            <p className="text-base text-muted-foreground">Busque um paciente ou registre uma nova entrada.</p>
          </div>
          {hasPermission('create_patient') && (<Button asChild className="h-11 w-full px-5 text-sm sm:w-auto">
            <Link href={`${baseUrl}/cadastro`}>
              <UserPlus className="mr-2 size-5" aria-hidden="true" />
              Cadastrar paciente
            </Link>
          </Button>)}
        </div>

        <Card className="gap-3 py-4">
          <CardHeader className="gap-3 px-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <Label htmlFor="patient-search" className="sr-only">Buscar paciente</Label>
              <div className="relative">
                <Search aria-hidden="true" className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="patient-search"
                  type="search"
                  placeholder="Nome, prontuário ou CPF"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 rounded-lg pl-12 text-base md:text-base"
                />
              </div>
            </div>
            <div role="group" aria-label="Filtrar pacientes por atendimento" className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: 'Todos os pacientes' },
                { value: 'active', label: 'Em atendimento' },
                { value: 'available', label: 'Disponíveis para entrada' },
              ] as const).map(({ value, label }) => (
                <Button key={value} variant={careFilter === value ? 'default' : 'outline'}
                  aria-pressed={careFilter === value} onClick={() => setCareFilter(value)}
                  className="min-h-11 h-auto whitespace-normal px-3 py-2 text-sm">
                  {label}
                </Button>
              ))}
            </div>
            </div>
            <CardDescription role="status" aria-live="polite" className="text-sm">
              {filteredPatients.length} {filteredPatients.length === 1 ? 'paciente encontrado' : 'pacientes encontrados'}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            {filteredPatients.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-12 text-center">
                <Search aria-hidden="true" className="mx-auto mb-4 size-8 text-muted-foreground" />
                <p className="text-lg font-semibold">Nenhum paciente encontrado</p>
                <p className="mt-2 text-base text-muted-foreground">Tente outro nome, prontuário ou CPF, ou altere o filtro.</p>
                {(search || careFilter !== 'all') && (
                  <Button variant="outline" className="mt-5 h-12 text-base" onClick={() => { setSearch(''); setCareFilter('all') }}>
                    <X aria-hidden="true" className="mr-2 size-4" />Limpar busca e filtros
                  </Button>
                )}
              </div>
            ) : (
              <ul aria-label="Pacientes encontrados" className="divide-y overflow-hidden rounded-lg border">
                {filteredPatients.map((patient) => (
                  <li key={patient.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 bg-card px-3 py-2 hover:bg-muted/30 sm:px-4 lg:grid-cols-[minmax(0,1fr)_176px_240px] 2xl:grid-cols-[minmax(0,1fr)_210px_176px_240px]">
                    <div className="min-w-0 space-y-1">
                      <p className="break-words text-base font-semibold leading-snug text-foreground">{patient.nomeCompleto}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Prontuário <span className="font-mono text-foreground">{patient.prontuario}</span></span>
                        <span>CPF <span className="font-mono">{patient.cpf}</span></span>
                      </div>
                    </div>
                    <div className="hidden space-y-1 text-xs text-muted-foreground 2xl:block">
                      <p className="flex items-center gap-2"><Calendar aria-hidden="true" className="size-3.5 shrink-0" /><span>Entrada: {formatDate(patient.dataEntrada)}</span></p>
                    </div>
                    <div className="flex min-w-0 justify-end lg:justify-start">
                      <StatusBadge status={patient.status} className="max-w-full px-2.5 py-1 text-xs" />
                    </div>
                    <div className="col-span-2 grid w-full grid-cols-2 gap-2 lg:col-span-1 lg:grid-cols-[104px_128px]">
                      <Button variant="outline" asChild className="h-11 w-full px-3 text-sm">
                        <Link href={`/paciente/${patient.id}`} aria-label={`Ver ficha de ${patient.nomeCompleto}`}>
                          <Eye aria-hidden="true" className="size-4" />Ver ficha
                        </Link>
                      </Button>
                      {canRegisterIntake && canCheckIn(patient) ? (
                        <Button className="h-11 w-full px-3 text-sm" onClick={() => openIntake(patient)} aria-label={`Dar entrada para ${patient.nomeCompleto}`}>
                          <LogIn aria-hidden="true" className="size-4" />Dar entrada
                        </Button>
                      ) : (
                        <span className="flex h-11 w-full items-center justify-center rounded-md bg-secondary px-2 text-center text-xs font-medium text-secondary-foreground">
                          {canCheckIn(patient) ? 'Entrada indisponível' : 'Em atendimento'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && closeIntake()}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dar Entrada e Encaminhar para Triagem</DialogTitle>
            <DialogDescription>
              Registre a queixa inicial informada na recepcao e encaminhe o paciente para a triagem.
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <div className="space-y-5">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm md:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Paciente</p>
                  <p className="font-medium">{selectedPatient.nomeCompleto}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Prontuario</p>
                  <p className="font-medium">{selectedPatient.prontuario}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CPF</p>
                  <p className="font-medium">{selectedPatient.cpf}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedPatient.telefone || 'Nao informado'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base" htmlFor="queixaPrincipal">Queixa Inicial *</Label>
                <Input
                  className="h-14 px-4 text-base md:text-base"
                  id="queixaPrincipal"
                  value={intakeForm.queixaPrincipal}
                  onChange={(e) => setIntakeForm((prev) => ({ ...prev, queixaPrincipal: e.target.value }))}
                  placeholder="Ex.: dor no peito, falta de ar, tontura"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base" htmlFor="descricaoInicial">Relato Inicial do Paciente</Label>
                <Textarea
                  className="min-h-32 px-4 py-3 text-base md:text-base"
                  id="descricaoInicial"
                  value={intakeForm.descricaoInicial}
                  onChange={(e) => setIntakeForm((prev) => ({ ...prev, descricaoInicial: e.target.value }))}
                  placeholder="Descreva resumidamente o que o paciente relatou na recepcao."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-14 text-base" onClick={closeIntake}>
              Cancelar
            </Button>
            <Button type="button" className="h-14 text-base" onClick={handleCheckIn} disabled={!intakeForm.queixaPrincipal.trim()}>
              Encaminhar para Triagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
