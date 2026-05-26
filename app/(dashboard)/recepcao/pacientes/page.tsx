'use client'

import { useState, useMemo } from 'react'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge, PriorityBadge } from '@/components/shared/badges'
import { Search, Plus, Eye, Edit2, UserPlus, Filter } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Patient, PatientStatus, STATUS_LABELS, PRIORITY_LABELS, Priority } from '@/lib/types'

export default function PacientesPage() {
  const { user } = useAuth()
  const { patients, updatePatientStatus } = useData()
  const router = useRouter()
  
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      // Filtro de busca
      const searchLower = search.toLowerCase()
      const matchesSearch = search === '' || 
        patient.nomeCompleto.toLowerCase().includes(searchLower) ||
        patient.prontuario.toLowerCase().includes(searchLower) ||
        patient.cpf.includes(search)
      
      // Filtro de status
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter
      
      // Filtro de prioridade
      const matchesPriority = priorityFilter === 'all' || patient.prioridade === priorityFilter
      
      return matchesSearch && matchesStatus && matchesPriority
    }).sort((a, b) => new Date(b.dataEntrada).getTime() - new Date(a.dataEntrada).getTime())
  }, [patients, search, statusFilter, priorityFilter])

  const handleEncaminharTriagem = (patientId: string) => {
    updatePatientStatus(patientId, 'aguardando_triagem')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Gerenciar todos os pacientes cadastrados</p>
        </div>
        <Button asChild>
          <Link href="/recepcao/cadastro">
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            {filteredPatients.length} paciente(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, prontuario ou CPF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum paciente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-sm">
                        {patient.prontuario}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{patient.nomeCompleto}</p>
                          <p className="text-xs text-muted-foreground">{patient.cpf}</p>
                        </div>
                      </TableCell>
                      <TableCell>{patient.idade} anos</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(patient.dataEntrada)}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={patient.prioridade} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={patient.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/paciente/${patient.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {patient.status === 'aguardando_triagem' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEncaminharTriagem(patient.id)}
                            >
                              Encaminhar
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
        </CardContent>
      </Card>
    </div>
  )
}
