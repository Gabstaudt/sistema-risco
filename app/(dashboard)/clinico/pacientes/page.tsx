'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge, PriorityBadge } from '@/components/shared/badges'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types'
import { Search, Eye, Stethoscope, Filter } from 'lucide-react'

export default function ClinicoPacientesPage() {
  const { patients } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const filteredPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const searchLower = search.trim().toLowerCase()
        const matchesSearch =
          search === '' ||
          patient.nomeCompleto.toLowerCase().includes(searchLower) ||
          patient.prontuario.toLowerCase().includes(searchLower) ||
          patient.cpf.includes(search)

        const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
        const matchesPriority = priorityFilter === 'all' || patient.prioridade === priorityFilter

        return matchesSearch && matchesStatus && matchesPriority
      })
      .sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime())
  }, [patients, priorityFilter, search, statusFilter])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionUrl = (patientId: string) => `/clinico/avaliar/${patientId}`

  return (
    <>
      <Header breadcrumbs={[{ label: 'Pacientes' }]} />
      <div className="flex-1 w-full min-w-0 space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Pacientes do Clinico</h1>
          <p className="text-muted-foreground">Visualize, filtre e acesse rapidamente as avaliacoes clinicas.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Pacientes</CardTitle>
            <CardDescription>{filteredPatients.length} paciente(s) encontrado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Buscar pacientes por nome, prontuário ou CPF"
                  placeholder="Buscar por nome, prontuário ou CPF..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Filtrar por status" className="h-11 w-full sm:min-w-[220px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger aria-label="Filtrar por prioridade" className="h-11 w-full sm:min-w-[170px]">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ul className="divide-y rounded-lg border px-3 md:hidden">
              {filteredPatients.length === 0 && <li className="py-8 text-center text-muted-foreground">Nenhum paciente encontrado</li>}
              {filteredPatients.map((patient) => (
                <li key={patient.id} className="space-y-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{patient.nomeCompleto}</p>
                      <p className="text-xs text-muted-foreground">{patient.prontuario} · {patient.idade} anos</p>
                    </div>
                    <PriorityBadge priority={patient.prioridade} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge status={patient.status} />
                    <span>{formatDate(patient.dataEntrada)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild className="h-11"><Link href={getActionUrl(patient.id)}><Stethoscope className="h-4 w-4" />Avaliar</Link></Button>
                    <Button asChild variant="outline" className="h-11"><Link href={`/paciente/${patient.id}`}><Eye className="h-4 w-4" />Ver ficha</Link></Button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-xl border bg-background md:block">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead className="whitespace-nowrap">Idade</TableHead>
                      <TableHead className="whitespace-nowrap">Entrada</TableHead>
                      <TableHead className="whitespace-nowrap">Prioridade</TableHead>
                      <TableHead className="w-44 whitespace-nowrap">Status</TableHead>
                      <TableHead className="w-56 text-right whitespace-nowrap">Ações</TableHead>
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
                          <TableCell className="min-w-[220px]">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{patient.nomeCompleto}</p>
                              <p className="text-xs text-muted-foreground">{patient.prontuario} · {patient.cpf}</p>
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{patient.idade} anos</TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{formatDate(patient.dataEntrada)}</TableCell>
                          <TableCell>
                            <PriorityBadge priority={patient.prioridade} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={patient.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" asChild className="h-11 shrink-0 px-3">
                                <Link href={getActionUrl(patient.id)}>
                                  <Stethoscope className="mr-2 h-4 w-4" />
                                  Avaliar
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild className="h-11 shrink-0 px-3">
                                <Link href={`/paciente/${patient.id}`}><Eye className="h-4 w-4" />Ver ficha</Link>
                              </Button>
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
      </div>
    </>
  )
}
