'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Loader2, Save, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CadastroPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { createPatient } = useData()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    dataNascimento: '',
    sexo: '' as 'M' | 'F' | 'O' | '',
    cpf: '',
    cartaoSus: '',
    telefone: '',
    endereco: '',
    responsavel: '',
    contatoEmergencia: '',
    unidade: 'Hospital Central',
  })

  const calcularIdade = (dataNascimento: string): number => {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }
    return idade
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nomeCompleto || !formData.dataNascimento || !formData.sexo || !formData.cpf || !formData.telefone) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha todos os campos obrigatorios.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const newPatient = createPatient({
        ...formData,
        sexo: formData.sexo as 'M' | 'F' | 'O',
        idade: calcularIdade(formData.dataNascimento),
        dataEntrada: new Date().toISOString(),
        status: 'aguardando_triagem',
        prioridade: 'normal',
        examesSolicitados: [],
        cadastradoPor: user?.id || '',
      })

      toast({
        title: 'Paciente cadastrado',
        description: `${newPatient.nomeCompleto} foi cadastrado com sucesso.`,
      })

      // Redirecionar baseado no perfil
      const baseUrl = user?.role === 'triagem' ? '/triagem' : '/recepcao'
      router.push(`${baseUrl}/pacientes/${newPatient.id}`)
    } catch {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao cadastrar o paciente.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const baseUrl = user?.role === 'triagem' ? '/triagem' : '/recepcao'

  return (
    <>
      <Header 
        breadcrumbs={[
          { label: 'Pacientes', href: `${baseUrl}/pacientes` },
          { label: 'Novo Cadastro' }
        ]} 
      />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" asChild>
              <Link href={baseUrl}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Cadastrar Novo Paciente</h1>
              <p className="text-muted-foreground">Preencha os dados do paciente para iniciar o atendimento</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
                <CardDescription>Informacoes basicas do paciente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="nomeCompleto">Nome Completo *</Label>
                    <Input
                      id="nomeCompleto"
                      value={formData.nomeCompleto}
                      onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                      placeholder="Nome completo do paciente"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo *</Label>
                    <Select
                      value={formData.sexo}
                      onValueChange={(value) => setFormData({ ...formData, sexo: value as 'M' | 'F' | 'O' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="O">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cartaoSus">Cartao SUS</Label>
                    <Input
                      id="cartaoSus"
                      value={formData.cartaoSus}
                      onChange={(e) => setFormData({ ...formData, cartaoSus: e.target.value })}
                      placeholder="000 0000 0000 0000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contatoEmergencia">Contato de Emergencia</Label>
                    <Input
                      id="contatoEmergencia"
                      value={formData.contatoEmergencia}
                      onChange={(e) => setFormData({ ...formData, contatoEmergencia: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="endereco">Endereco</Label>
                    <Textarea
                      id="endereco"
                      value={formData.endereco}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, numero, bairro, cidade/UF"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsavel/Acompanhante</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      placeholder="Nome do responsavel"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade/Hospital</Label>
                    <Input
                      id="unidade"
                      value={formData.unidade}
                      onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                      placeholder="Hospital Central"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href={baseUrl}>Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Cadastrar Paciente
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
      <Toaster />
    </>
  )
}
