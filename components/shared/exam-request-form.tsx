'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function ExamRequestForm({ patientId }: { patientId: string }) {
  const { hasPermission } = useAuth()
  const { examTypes, requestExams } = useData()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [justification, setJustification] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!hasPermission('request_exams')) return null

  function submit() {
    if (busy || !selected.length) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      requestExams(patientId, selected, justification.trim())
      setSelected([])
      setJustification('')
      setMessage('Exames solicitados e enviados ao laboratório.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Não foi possível solicitar os exames.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Solicitação de exames</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Input aria-label="Buscar tipo de exame" placeholder="Buscar exame" className="h-12" value={search} onChange={event => setSearch(event.target.value)} />
        <div className="grid max-h-72 gap-3 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3">
          {examTypes.filter(exam => exam.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(exam => (
            <div key={exam.id} className="flex items-center gap-3 rounded-lg border p-3">
              <Checkbox id={`request-exam-${exam.id}`} checked={selected.includes(exam.id)} onCheckedChange={checked => {
                setSelected(current => checked ? [...current, exam.id] : current.filter(id => id !== exam.id))
                setMessage('')
              }} />
              <Label htmlFor={`request-exam-${exam.id}`} className="flex-1 cursor-pointer py-1">{exam.name}</Label>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label htmlFor="exam-justification">Justificativa (opcional)</Label>
          <Textarea id="exam-justification" value={justification} onChange={event => setJustification(event.target.value)} rows={2} />
        </div>
        {message && <p role="status" className="text-sm text-primary">{message}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="button" className="h-12" onClick={submit} disabled={busy || !selected.length}>Solicitar exames{selected.length ? ` (${selected.length})` : ''}</Button>
      </CardContent>
    </Card>
  )
}
