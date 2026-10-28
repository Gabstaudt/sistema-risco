'use client'
import { useRef,useState } from 'react'
import { useData } from '@/lib/data-context'
import { useAuth } from '@/lib/auth'
import { getPatientBasicDraft } from '@/lib/patient-basic-edit'
import type { Patient } from '@/lib/types'
import { PatientRegistrationFields } from './patient-registration-fields'
import { Button } from '@/components/ui/button'
export function PatientBasicEditForm({patient,onCancel,onSaved}:{patient:Patient;onCancel:()=>void;onSaved:()=>void}){
 const {hasPermission}=useAuth();const {updatePatientBasic}=useData();const [draft,setDraft]=useState(()=>getPatientBasicDraft(patient));const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false)
 if(!hasPermission('edit_patient_basic'))return null
 async function submit(event:React.FormEvent){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await updatePatientBasic(patient.id,draft);onSaved()}catch(error){setError(error instanceof Error?error.message:'Não foi possível salvar.')}finally{lock.current=false;setBusy(false)}}
 return <form className="space-y-5" onSubmit={submit}><PatientRegistrationFields prefix="edit-" draft={draft} onChange={setDraft} disabled={busy}/>{error&&<p role="alert" className="text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-3"><Button type="button" variant="outline" className="h-12" disabled={busy} onClick={onCancel}>Cancelar</Button><Button className="h-12" type="submit" disabled={busy}>Salvar alterações</Button></div></form>
}
