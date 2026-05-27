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
  const { patients, createPatient } = useData()
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
    queixaPrincipal: '',
    descricaoInicial: '',
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

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2')
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 10) {
      return digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
    }

    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
  }

  const dashboardBaseUrl = user?.role === 'triagem' ? '/triagem' : '/recepcao'
  const patientsListUrl = `${dashboardBaseUrl}/pacientes`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const normalizedName = formData.nomeCompleto.trim()
    const normalizedCpf = formData.cpf.replace(/\D/g, '')
    const normalizedPhone = formData.telefone.replace(/\D/g, '')
    const age = calcularIdade(formData.dataNascimento)

    if (!normalizedName || !formData.dataNascimento || !formData.sexo || !normalizedCpf || !normalizedPhone || !formData.queixaPrincipal.trim()) {
      toast({
        title: 'Campos obrigatorios',
        description: 'Preencha os dados obrigatorios e a queixa inicial do paciente.',
        variant: 'destructive',
      })
      return
    }

    if (normalizedCpf.length !== 11) {
      toast({
        title: 'CPF invalido',
        description: 'Informe um CPF com 11 digitos.',
        variant: 'destructive',
      })
      return
    }

    if (normalizedPhone.length < 10) {
      toast({
        title: 'Telefone invalido',
        description: 'Informe um telefone valido com DDD.',
        variant: 'destructive',
      })
      return
    }

    if (Number.isNaN(age) || age < 0) {
      toast({
        title: 'Data de nascimento invalida',
        description: 'Informe uma data de nascimento valida.',
        variant: 'destructive',
      })
      return
    }

    const patientAlreadyExists = patients.some(
      (patient) => patient.cpf.replace(/\D/g, '') === normalizedCpf
    )

    if (patientAlreadyExists) {
      toast({
        title: 'Paciente ja cadastrado',
        description: 'Ja existe um paciente com este CPF no sistema.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const newPatient = createPatient({
        ...formData,
        nomeCompleto: normalizedName,
        cpf: formatCpf(formData.cpf),
        telefone: formatPhone(formData.telefone),
        contatoEmergencia: formatPhone(formData.contatoEmergencia),
        cartaoSus: formData.cartaoSus.trim(),
        endereco: formData.endereco.trim(),
        responsavel: formData.responsavel.trim(),
        unidade: formData.unidade.trim() || 'Hospital Central',
        queixaPrincipal: formData.queixaPrincipal.trim(),
        descricaoInicial: formData.descricaoInicial.trim(),
        sexo: formData.sexo as 'M' | 'F' | 'O',
        idade: age,
        dataEntrada: new Date().toISOString(),
        status: 'aguardando_triagem',
        prioridade: 'normal',
        examesSolicitados: [],
        cadastradoPor: user?.id || '',
      })

      toast({
        title: 'Paciente encaminhado',
        description: `${newPatient.nomeCompleto} foi cadastrado e enviado para a triagem.`,
      })

      router.push(patientsListUrl)
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

  return (
    <>
      <Header 
        breadcrumbs={[
          { label: 'Pacientes', href: patientsListUrl },
          { label: 'Novo Cadastro' }
        ]} 
      />
      <div className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="icon" asChild>
              <Link href={patientsListUrl}>
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
                <CardDescription>Cadastro basico e registro da queixa inicial para encaminhamento a triagem</CardDescription>
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sexo">Sexo *</Label>
                    <Select
                      value={formData.sexo}
                      onValueChange={(value) => setFormData({ ...formData, sexo: value as 'M' | 'F' | 'O' })}
                      disabled={isLoading}
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
                      onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                      placeholder="000.000.000-00"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cartaoSus">Cartao SUS</Label>
                    <Input
                      id="cartaoSus"
                      value={formData.cartaoSus}
                      onChange={(e) => setFormData({ ...formData, cartaoSus: e.target.value })}
                      placeholder="000 0000 0000 0000"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contatoEmergencia">Contato de Emergencia</Label>
                    <Input
                      id="contatoEmergencia"
                      value={formData.contatoEmergencia}
                      onChange={(e) => setFormData({ ...formData, contatoEmergencia: formatPhone(e.target.value) })}
                      placeholder="(00) 00000-0000"
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsavel">Responsavel/Acompanhante</Label>
                    <Input
                      id="responsavel"
                      value={formData.responsavel}
                      onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                      placeholder="Nome do responsavel"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade/Hospital</Label>
                    <Input
                      id="unidade"
                      value={formData.unidade}
                      onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                      placeholder="Hospital Central"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="queixaPrincipal">Queixa Inicial *</Label>
                    <Input
                      id="queixaPrincipal"
                      value={formData.queixaPrincipal}
                      onChange={(e) => setFormData({ ...formData, queixaPrincipal: e.target.value })}
                      placeholder="Ex.: falta de ar, dor abdominal, tontura"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="descricaoInicial">Relato Inicial</Label>
                    <Textarea
                      id="descricaoInicial"
                      value={formData.descricaoInicial}
                      onChange={(e) => setFormData({ ...formData, descricaoInicial: e.target.value })}
                      placeholder="Descreva brevemente o que o paciente relata na recepcao."
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href={patientsListUrl}>Cancelar</Link>
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
                        Cadastrar e Encaminhar
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
