'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { PriorityBadge, StatusBadge } from '@/components/shared/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useData } from '@/lib/data-context'
import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/types'
import { Eye, Filter, Heart, Search } from 'lucide-react'

export default function CardiologistaPacientesPage() {
  const { patients } = useData()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const filteredPatients = useMemo(
    () =>
      patients
        .filter((patient) => {
          const searchLower = search.toLowerCase()
          const matchesSearch =
            search === '' ||
            patient.nomeCompleto.toLowerCase().includes(searchLower) ||
            patient.prontuario.toLowerCase().includes(searchLower) ||
            patient.cpf.includes(search)

          const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
          const matchesPriority = priorityFilter === 'all' || patient.prioridade === priorityFilter
          return matchesSearch && matchesStatus && matchesPriority
        })
        .sort((left, right) => new Date(right.dataEntrada).getTime() - new Date(left.dataEntrada).getTime()),
    [patients, priorityFilter, search, statusFilter],
  )

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <>
      <Header breadcrumbs={[{ label: 'Pacientes' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Pacientes da Cardiologia</h1>
          <p className="text-muted-foreground">Acompanhe os casos em avaliacao cardiologica e o historico pre-operatorio.</p>
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
                  className="h-11 pl-10"
                  placeholder="Buscar por nome, prontuario ou CPF..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:justify-end">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-11 w-full sm:min-w-[220px]">
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
                  <SelectTrigger className="h-11 w-full sm:min-w-[170px]">
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

            <div className="overflow-hidden rounded-xl border bg-background">
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prontuario</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Idade</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                          Nenhum paciente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPatients.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-mono text-sm">{patient.prontuario}</TableCell>
                          <TableCell className="min-w-[220px]">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{patient.nomeCompleto}</p>
                              <p className="text-xs text-muted-foreground">{patient.cpf}</p>
                            </div>
                          </TableCell>
                          <TableCell>{patient.idade} anos</TableCell>
                          <TableCell className="text-sm">{formatDate(patient.dataEntrada)}</TableCell>
                          <TableCell>
                            <PriorityBadge priority={patient.prioridade} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={patient.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/paciente/${patient.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/cardiologista/avaliacao/${patient.id}`}>
                                  <Heart className="mr-2 h-4 w-4" />
                                  Avaliar
                                </Link>
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
