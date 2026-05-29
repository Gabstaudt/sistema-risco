'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/shared/badges'
import { Search, Eye, UserPlus, LogIn, ClipboardPlus } from 'lucide-react'
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
  'aguardando_cirurgiao',
  'em_avaliacao_cirurgica',
]

type IntakeFormState = {
  queixaPrincipal: string
  descricaoInicial: string
}

export default function PacientesPage() {
  const { patients, updatePatient } = useData()

  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [intakeForm, setIntakeForm] = useState<IntakeFormState>({
    queixaPrincipal: '',
    descricaoInicial: '',
  })

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const searchLower = search.toLowerCase()
        return (
          search === '' ||
          patient.nomeCompleto.toLowerCase().includes(searchLower) ||
          patient.prontuario.toLowerCase().includes(searchLower) ||
          patient.cpf.includes(search)
        )
      })
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
  }, [patients, search])

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
    if (!selectedPatient || !intakeForm.queixaPrincipal.trim()) {
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
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Entrada de Pacientes</h1>
          <p className="text-muted-foreground">
            Busque pacientes ja cadastrados, registre a queixa inicial e encaminhe para a triagem.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/recepcao/cadastro">
            <UserPlus className="mr-2 h-4 w-4" />
            Cadastrar Paciente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pacientes Cadastrados</CardTitle>
          <CardDescription>
            {filteredPatients.length} paciente(s) encontrado(s). A recepcao so registra dados basicos e encaminha para a triagem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, prontuario ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border bg-background">
            <div className="w-full overflow-x-auto">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Prontuario</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="whitespace-nowrap">Telefone</TableHead>
                    <TableHead className="whitespace-nowrap">Ultima Entrada</TableHead>
                    <TableHead className="whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        Nenhum paciente encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="whitespace-nowrap font-mono text-sm">{patient.prontuario}</TableCell>
                        <TableCell className="min-w-[260px]">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{patient.nomeCompleto}</p>
                            <p className="text-xs text-muted-foreground">{patient.cpf}</p>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{patient.telefone || 'Nao informado'}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{formatDate(patient.dataEntrada)}</TableCell>
                        <TableCell>
                          <StatusBadge status={patient.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" asChild className="shrink-0">
                              <Link href={`/paciente/${patient.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {canCheckIn(patient) ? (
                              <Button variant="outline" size="sm" className="shrink-0" onClick={() => openIntake(patient)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Dar Entrada
                              </Button>
                            ) : (
                              <Button variant="secondary" size="sm" className="shrink-0" disabled>
                                <ClipboardPlus className="mr-2 h-4 w-4" />
                                Em Atendimento
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && closeIntake()}>
        <DialogContent className="sm:max-w-2xl">
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
                <Label htmlFor="queixaPrincipal">Queixa Inicial *</Label>
                <Input
                  id="queixaPrincipal"
                  value={intakeForm.queixaPrincipal}
                  onChange={(e) => setIntakeForm((prev) => ({ ...prev, queixaPrincipal: e.target.value }))}
                  placeholder="Ex.: dor no peito, falta de ar, tontura"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricaoInicial">Relato Inicial do Paciente</Label>
                <Textarea
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
            <Button type="button" variant="outline" onClick={closeIntake}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCheckIn} disabled={!intakeForm.queixaPrincipal.trim()}>
              Encaminhar para Triagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
