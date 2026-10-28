import type {Patient} from '@/lib/types'
import {TRIAGE_SECTORS} from '@/lib/triage-intake'
export function TriageIntakeSummary({patient}:{patient:Patient}){
 const intake=patient.triageData?.intake
 if(!intake)return null
 const fields=[['Anamnese',intake.anamnesis],['Procedência',intake.origin],['ECG realizado',intake.ecg==='sim'?'Sim':intake.ecg==='nao'?'Não':''],['Doenças preexistentes',intake.preexistingDiseases],['Intolerâncias ou alergias',intake.intolerances],['Medicamentos em uso',intake.medicationsInUse==='sim'?intake.medications:intake.medicationsInUse==='nao'?'Não':''],['HGT (mg/dL)',patient.triageData?.vitalSigns?.hgt?.toString()],['Glasgow',patient.triageData?.vitalSigns?.glasgow?.toString()],['Dor',intake.pain],['Tipo de atendimento',intake.careType],['Estado do paciente',intake.patientStates.join(', ')],['Sintomas',intake.symptoms.join(', ')],['Outros detalhes',intake.otherDetails],['Setor de destino',intake.sectorName||TRIAGE_SECTORS[intake.destination]]]
 return <dl className="grid gap-4 sm:grid-cols-2">{fields.map(([label,value])=><div key={label} className="min-w-0"><dt className="text-sm font-medium">{label}</dt><dd className="whitespace-pre-wrap break-words">{value||'Não informado'}</dd></div>)}</dl>
}
