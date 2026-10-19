'use client'
import { useEffect } from 'react'
import { useData } from '@/lib/data-context'
export function CareStartTracker({patientId}:{patientId:string}){const {registerCareStart}=useData();useEffect(()=>{registerCareStart(patientId)},[patientId,registerCareStart]);return null}
