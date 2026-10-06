'use client'

import { useState, type FormEvent } from 'react'
import { Loader2, Save } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { getPatientBasicDraft, type PatientBasicDraft } from '@/lib/patient-basic-edit'
import type { Patient } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

const inputFields: { key: keyof PatientBasicDraft; label: string; type?: string; required?: boolean; wide?: boolean }[] = [
  { key: 'nomeCompleto', label: 'Nome completo', required: true, wide: true },
  { key: 'cpf', label: 'CPF', required: true },
  { key: 'dataNascimento', label: 'Data de nascimento', type: 'date', required: true },
  { key: 'sexo', label: 'Sexo', type: 'select', required: true },
  { key: 'cartaoSus', label: 'Cartão SUS' },
  { key: 'telefone', label: 'Telefone', type: 'tel', required: true },
  { key: 'contatoEmergencia', label: 'Contato de emergência', type: 'tel' },
  { key: 'responsavel', label: 'Responsável / acompanhante' },
  { key: 'unidade', label: 'Unidade / hospital' },
  { key: 'endereco', label: 'Endereço', wide: true },
  { key: 'queixaPrincipal', label: 'Queixa inicial registrada', wide: true },
]

export function PatientBasicEditForm({ patient, onCancel, onSaved }: { patient: Patient; onCancel: () => void; onSaved: () => void }) {
  const { hasPermission } = useAuth()
  const { updatePatientBasic } = useData()
  const [draft, setDraft] = useState(() => getPatientBasicDraft(patient))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const canEdit = hasPermission('edit_patient_basic')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await updatePatientBasic(patient.id, draft)
      onSaved()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível salvar o cadastro. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) return null

  return (
    <form onSubmit={submit} className="space-y-6">
      <p className="text-sm text-muted-foreground">Prontuário {patient.prontuario} · A idade é atualizada pela data de nascimento.</p>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="grid gap-6 sm:grid-cols-2">
        {inputFields.map(({ key, label, type = 'text', required, wide }) => (
          <div key={key} className={wide ? 'space-y-2 sm:col-span-2' : 'space-y-2'}>
            <Label htmlFor={`edit-${key}`} className="text-base">{label}{required ? ' *' : ''}</Label>
            {type === 'select' ? (
              <select id={`edit-${key}`} value={draft[key]} required disabled={saving}
                className="h-14 w-full rounded-md border border-input bg-card px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}>
                <option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="O">Outro</option>
              </select>
            ) : (
              <Input id={`edit-${key}`} type={type} value={draft[key]} required={required} disabled={saving}
                className="h-14 px-4 text-base md:text-base" autoFocus={key === 'nomeCompleto'}
                onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />
            )}
          </div>
        ))}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-descricaoInicial" className="text-base">Relato inicial</Label>
          <Textarea id="edit-descricaoInicial" value={draft.descricaoInicial} disabled={saving}
            className="min-h-28 px-4 py-3 text-base md:text-base"
            onChange={(event) => setDraft((current) => ({ ...current, descricaoInicial: event.target.value }))} />
        </div>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="h-12 px-6 text-base" disabled={saving} onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="h-12 px-6 text-base" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
