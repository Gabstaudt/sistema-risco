'use client'

import { useParams, useRouter } from 'next/navigation'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusBadge, RiskBadge } from '@/components/shared/badges'
import { ArrowLeft, Printer, Download, FileText, CheckCircle, AlertTriangle, XCircle, Heart, Activity, Stethoscope, Calendar, User } from 'lucide-react'
import Link from 'next/link'
import { RISK_LABELS, STATUS_LABELS, ASAScore } from '@/lib/types'

const ASA_DESCRIPTIONS: Record<ASAScore, string> = {
  1: 'Paciente saudavel',
  2: 'Doenca sistemica leve',
  3: 'Doenca sistemica grave',
  4: 'Doenca sistemica grave com risco de vida',
  5: 'Paciente moribundo',
  6: 'Morte cerebral declarada'
}

export default function RelatorioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { getPatient, getExamRequestsByPatient, getAuditLogsByPatient } = useData()
  
  const patient = getPatient(params.id as string)
  const exams = getExamRequestsByPatient(params.id as string)
  const auditLogs = getAuditLogsByPatient(params.id as string)
  
  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Paciente nao encontrado</p>
        <Button asChild>
          <Link href="/cirurgiao">Voltar ao Dashboard</Link>
        </Button>
      </div>
    )
  }

  const evaluation = patient.avaliacaoCirurgica
  const clinicalEval = patient.avaliacaoClinica
  const vitalSigns = patient.sinaisVitais
  const completedExams = exams.filter(e => e.status === 'concluido')

  const getRiskIcon = () => {
    if (!evaluation?.riscoFinal) return null
    switch (evaluation.riscoFinal) {
      case 'baixo':
        return <CheckCircle className="h-8 w-8 text-emerald-500" />
      case 'moderado':
        return <AlertTriangle className="h-8 w-8 text-amber-500" />
      case 'alto':
        return <AlertTriangle className="h-8 w-8 text-red-500" />
      case 'contraindicado':
        return <XCircle className="h-8 w-8 text-violet-600" />
      default:
        return null
    }
  }

  const getRiskColor = () => {
    if (!evaluation?.riscoFinal) return ''
    switch (evaluation.riscoFinal) {
      case 'baixo':
        return 'border-emerald-200 bg-emerald-50'
      case 'moderado':
        return 'border-amber-200 bg-amber-50'
      case 'alto':
        return 'border-red-200 bg-red-50'
      case 'contraindicado':
        return 'border-violet-200 bg-violet-50'
      default:
        return ''
    }
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

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header - escondido na impressao */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Relatorio de Avaliacao</h1>
            <p className="text-muted-foreground">Avaliacao de Risco Cirurgico Pre-Operatorio</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Cabecalho do Relatorio */}
      <Card className="print:shadow-none print:border-2">
        <CardHeader className="bg-primary/5 print:bg-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center print:bg-gray-200">
                <Heart className="h-8 w-8 text-primary print:text-gray-700" />
              </div>
              <div>
                <CardTitle className="text-xl">MedRisk Pro</CardTitle>
                <CardDescription>Sistema de Avaliacao de Risco Cirurgico</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Documento gerado em:</p>
              <p className="font-medium">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dados do Paciente */}
      <Card className="print:shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Identificacao do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome Completo</p>
              <p className="font-medium">{patient.nomeCompleto}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Prontuario</p>
              <p className="font-medium font-mono">{patient.prontuario}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-medium">{patient.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium">{patient.dataNascimento} ({patient.idade} anos)</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sexo</p>
              <p className="font-medium">{patient.sexo === 'M' ? 'Masculino' : patient.sexo === 'F' ? 'Feminino' : 'Outro'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Entrada</p>
              <p className="font-medium">{formatDate(patient.dataEntrada)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Classificacao de Risco Final */}
      {evaluation && (
        <Card className={`print:shadow-none ${getRiskColor()}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Classificacao de Risco Final
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {getRiskIcon()}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-2xl font-bold">
                    {RISK_LABELS[evaluation.riscoFinal]}
                  </h3>
                  <RiskBadge risk={evaluation.riscoFinal} />
                </div>
                <p className="text-muted-foreground">{evaluation.conduta}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Score ASA</p>
                <p className="text-3xl font-bold text-primary">{evaluation.scores.asa || '-'}</p>
                {evaluation.scores.asa && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {ASA_DESCRIPTIONS[evaluation.scores.asa]}
                  </p>
                )}
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Score RCRI</p>
                <p className="text-3xl font-bold text-primary">{evaluation.scores.rcri ?? '-'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Revised Cardiac Risk Index
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-background">
                <p className="text-sm text-muted-foreground mb-1">Score VSG-CRI</p>
                <p className="text-3xl font-bold text-primary">{evaluation.scores.vsgCri ?? '-'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vascular Surgery Group
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dados da Cirurgia */}
      {evaluation && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Procedimento Cirurgico Proposto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Cirurgia</p>
                <p className="font-medium">{evaluation.tipoCirurgia}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Especialidade</p>
                <p className="font-medium">{evaluation.especialidade}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Porte Cirurgico</p>
                <Badge variant="outline" className="mt-1">
                  {evaluation.porteCirurgico.charAt(0).toUpperCase() + evaluation.porteCirurgico.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgencia</p>
                <Badge variant="outline" className="mt-1">
                  {evaluation.urgencia.charAt(0).toUpperCase() + evaluation.urgencia.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Anestesia Prevista</p>
                <p className="font-medium">{evaluation.anestesiaPrevista}</p>
              </div>
            </div>
            
            {evaluation.observacoesCirurgiao && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Observacoes do Cirurgiao</p>
                  <p className="text-sm bg-muted p-3 rounded-lg">{evaluation.observacoesCirurgiao}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sinais Vitais */}
      {vitalSigns && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Sinais Vitais</CardTitle>
            <CardDescription>Registrado em: {formatDate(vitalSigns.registradoEm)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Pressao Arterial</p>
                <p className="text-xl font-bold">{vitalSigns.pressaoSistolica}/{vitalSigns.pressaoDiastolica}</p>
                <p className="text-xs text-muted-foreground">mmHg</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Freq. Cardiaca</p>
                <p className="text-xl font-bold">{vitalSigns.frequenciaCardiaca}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Saturacao</p>
                <p className="text-xl font-bold">{vitalSigns.saturacao}%</p>
                <p className="text-xs text-muted-foreground">SpO2</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">IMC</p>
                <p className="text-xl font-bold">{vitalSigns.imc?.toFixed(1) || '-'}</p>
                <p className="text-xs text-muted-foreground">kg/m2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comorbidades */}
      {clinicalEval?.comorbidades && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Comorbidades e Antecedentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clinicalEval.comorbidades.hipertensao && (
                <Badge variant="secondary">Hipertensao</Badge>
              )}
              {clinicalEval.comorbidades.diabetes && (
                <Badge variant="secondary">Diabetes</Badge>
              )}
              {clinicalEval.comorbidades.cardiopatia && (
                <Badge variant="secondary">Cardiopatia</Badge>
              )}
              {clinicalEval.comorbidades.avcPrevio && (
                <Badge variant="secondary">AVC Previo</Badge>
              )}
              {clinicalEval.comorbidades.dpoc && (
                <Badge variant="secondary">DPOC</Badge>
              )}
              {clinicalEval.comorbidades.doencaRenal && (
                <Badge variant="secondary">Doenca Renal</Badge>
              )}
              {clinicalEval.comorbidades.tabagismo && (
                <Badge variant="secondary">Tabagismo</Badge>
              )}
              {clinicalEval.comorbidades.anticoagulantes && (
                <Badge variant="destructive">Uso de Anticoagulantes</Badge>
              )}
              {clinicalEval.comorbidades.outras.map((item, i) => (
                <Badge key={i} variant="outline">{item}</Badge>
              ))}
            </div>
            
            {clinicalEval.comorbidades.alergias.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-red-600 mb-2">Alergias:</p>
                <div className="flex flex-wrap gap-2">
                  {clinicalEval.comorbidades.alergias.map((alergia, i) => (
                    <Badge key={i} variant="destructive">{alergia}</Badge>
                  ))}
                </div>
              </div>
            )}
            
            {clinicalEval.comorbidades.medicacoes.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Medicacoes em Uso:</p>
                <p className="text-sm text-muted-foreground">
                  {clinicalEval.comorbidades.medicacoes.join(', ')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Exames Realizados */}
      {completedExams.length > 0 && (
        <Card className="print:shadow-none">
          <CardHeader>
            <CardTitle>Exames Realizados</CardTitle>
            <CardDescription>{completedExams.length} exame(s) concluido(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedExams.map(exam => (
                <div key={exam.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{exam.examTypeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {exam.concluidoEm && formatDate(exam.concluidoEm)}
                    </p>
                  </div>
                  {exam.resultado && (
                    <p className="text-sm bg-muted p-2 rounded">{exam.resultado}</p>
                  )}
                  {exam.observacoesLab && (
                    <p className="text-xs text-muted-foreground mt-1">{exam.observacoesLab}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assinatura */}
      {evaluation && (
        <Card className="print:shadow-none print:break-inside-avoid">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center">
              <Separator className="w-64 mb-2" />
              <p className="font-medium">{evaluation.assinatura}</p>
              <p className="text-sm text-muted-foreground">Cirurgiao Responsavel</p>
              <p className="text-xs text-muted-foreground mt-1">
                Avaliado em: {formatDate(evaluation.avaliadoEm)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer para impressao */}
      <div className="hidden print:block text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
        <p>Este documento foi gerado eletronicamente pelo sistema MedRisk Pro</p>
        <p>Documento para fins medicos - Confidencial</p>
      </div>
    </div>
  )
}
