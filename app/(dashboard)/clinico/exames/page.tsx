'use client'

import { useState } from 'react'
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
import { Plus, Search, Edit2, Trash2, FlaskConical } from 'lucide-react'
import { ExamType } from '@/lib/types'

const EXAM_CATEGORIES = [
  'Laboratorio',
  'Imagem',
  'Cardiologia',
  'Pneumologia',
  'Outros'
]

export default function ExamesClinicosPage() {
  const { user } = useAuth()
  const { examTypes, createExamType } = useData()
  
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    valueReference: ''
  })

  const filteredExams = examTypes.filter(exam => {
    const matchesSearch = search === '' || 
      exam.name.toLowerCase().includes(search.toLowerCase()) ||
      exam.description?.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = categoryFilter === 'all' || exam.category === categoryFilter
    
    return matchesSearch && matchesCategory
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.category) return
    
    createExamType({
      name: formData.name,
      category: formData.category,
      description: formData.description || undefined,
      valueReference: formData.valueReference || undefined,
      createdBy: user?.id || ''
    })
    
    // Reset form
    setFormData({
      name: '',
      category: '',
      description: '',
      valueReference: ''
    })
    setIsDialogOpen(false)
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Laboratorio': 'bg-blue-100 text-blue-800',
      'Imagem': 'bg-purple-100 text-purple-800',
      'Cardiologia': 'bg-red-100 text-red-800',
      'Pneumologia': 'bg-cyan-100 text-cyan-800',
      'Outros': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || colors['Outros']
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tipos de Exames</h1>
          <p className="text-muted-foreground">Gerenciar tipos de exames disponiveis para solicitacao</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo de Exame
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Cadastrar Tipo de Exame</DialogTitle>
                <DialogDescription>
                  Adicione um novo tipo de exame ao sistema
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Exame *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Hemograma Completo"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXAM_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valueReference">Valores de Referencia</Label>
                  <Textarea
                    id="valueReference"
                    placeholder="Ex: Hemoglobina: 12-16 g/dL (mulheres), 14-18 g/dL (homens)"
                    value={formData.valueReference}
                    onChange={(e) => setFormData(prev => ({ ...prev, valueReference: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Cadastrar Exame
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Exames Cadastrados
          </CardTitle>
          <CardDescription>
            {filteredExams.length} tipo(s) de exame(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-6">
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {EXAM_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Exame</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead>Valores de Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum tipo de exame encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        {exam.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getCategoryColor(exam.category)}>
                          {exam.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-muted-foreground">
                        {exam.description || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm">
                        {exam.valueReference || '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Cards por categoria */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {EXAM_CATEGORIES.map((category) => {
          const examsInCategory = examTypes.filter(e => e.category === category)
          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Badge variant="secondary" className={getCategoryColor(category)}>
                    {category}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{examsInCategory.length}</p>
                <p className="text-sm text-muted-foreground">exame(s) cadastrado(s)</p>
                {examsInCategory.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {examsInCategory.slice(0, 3).map(exam => (
                      <p key={exam.id} className="text-sm text-muted-foreground truncate">
                        {exam.name}
                      </p>
                    ))}
                    {examsInCategory.length > 3 && (
                      <p className="text-sm text-primary">
                        +{examsInCategory.length - 3} mais
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
