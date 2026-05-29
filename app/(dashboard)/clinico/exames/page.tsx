'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search, FlaskConical } from 'lucide-react'

const EXAM_CATEGORIES = ['Laboratorio', 'Imagem', 'Cardiologia', 'Pneumologia', 'Outros']

export default function ExamesClinicosPage() {
  const { user } = useAuth()
  const { examTypes, createExamType } = useData()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    valueReference: '',
  })

  const filteredExams = examTypes.filter((exam) => {
    const matchesSearch =
      search === '' ||
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.description?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  const categorySummary = EXAM_CATEGORIES.map((category) => ({
    category,
    count: examTypes.filter((exam) => exam.category === category).length,
  }))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.category) return

    createExamType({
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      valueReference: formData.valueReference || undefined,
      createdBy: user?.id || '',
    })

    setFormData({
      name: '',
      category: '',
      description: '',
      valueReference: '',
    })
    setIsDialogOpen(false)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Laboratorio: 'bg-blue-100 text-blue-800 border-blue-200',
      Imagem: 'bg-violet-100 text-violet-800 border-violet-200',
      Cardiologia: 'bg-red-100 text-red-800 border-red-200',
      Pneumologia: 'bg-cyan-100 text-cyan-800 border-cyan-200',
      Outros: 'bg-slate-100 text-slate-800 border-slate-200',
    }

    return colors[category] || colors.Outros
  }

  return (
    <>
      <Header breadcrumbs={[{ label: 'Tipos de Exames' }]} />
      <div className="mx-auto flex-1 w-full max-w-7xl space-y-6 px-4 pb-8 pt-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Tipos de Exames</h1>
            <p className="max-w-3xl text-muted-foreground">
              Cadastre e consulte os exames disponiveis para solicitacao clinica sem comprometer o fluxo da tela.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full lg:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Novo Tipo de Exame
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Cadastrar Tipo de Exame</DialogTitle>
                  <DialogDescription>Adicione um novo tipo de exame ao sistema.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Exame *</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Hemograma Completo"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAM_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descricao</Label>
                    <Textarea
                      id="description"
                      placeholder="Descricao do exame e indicacoes"
                      value={formData.description}
                      onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valueReference">Valores de Referencia</Label>
                    <Textarea
                      id="valueReference"
                      placeholder="Ex: Hemoglobina: 12-16 g/dL"
                      value={formData.valueReference}
                      onChange={(e) => setFormData((prev) => ({ ...prev, valueReference: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Cadastrar Exame</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Card className="xl:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold">{examTypes.length}</p>
              <p className="text-sm text-muted-foreground">tipos cadastrados</p>
            </CardContent>
          </Card>
          {categorySummary.map(({ category, count }) => (
            <Card key={category} className="xl:col-span-1">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`rounded-lg border p-2 ${getCategoryColor(category)}`}>
                  <FlaskConical className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-semibold">{count}</p>
                  <p className="truncate text-sm text-muted-foreground">{category}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Exames Cadastrados
            </CardTitle>
            <CardDescription>{filteredExams.length} tipo(s) de exame(s) conforme os filtros aplicados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou descricao..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full lg:w-[220px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {EXAM_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border">
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">Nome do Exame</TableHead>
                      <TableHead className="w-[160px]">Categoria</TableHead>
                      <TableHead className="min-w-[220px]">Descricao</TableHead>
                      <TableHead className="min-w-[220px]">Valores de Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExams.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                          Nenhum tipo de exame encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredExams.map((exam) => (
                        <TableRow key={exam.id} className="align-top">
                          <TableCell className="font-medium whitespace-normal break-words">{exam.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getCategoryColor(exam.category)}>
                              {exam.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                            {exam.description || '-'}
                          </TableCell>
                          <TableCell className="whitespace-normal break-words text-sm text-muted-foreground">
                            {exam.valueReference || '-'}
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
