'use client'
import {MedicalWorkspace} from './medical-workspace'
import { useEffect } from 'react'
import { useData } from '@/lib/data-context'
export function CareStartTracker({patientId}:{patientId:string}){const {registerCareStart}=useData();useEffect(()=>{registerCareStart(patientId)},[patientId,registerCareStart]);return <MedicalWorkspace patientId={patientId}/>}
