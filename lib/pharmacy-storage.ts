'use client'
import {PHARMACY_KEY,MEDICATION_STORAGE_KEY,emptyPharmacy,type PharmacyState} from './pharmacy'
import type {MedicationOrder} from './types'
export const PHARMACY_EVENT='medrisk-pharmacy-updated'
export function readPharmacy():PharmacyState{return JSON.parse(localStorage.getItem(PHARMACY_KEY)||'null')||emptyPharmacy()}
export function readMedicationOrders():MedicationOrder[]{
 const orders:MedicationOrder[]=JSON.parse(localStorage.getItem(MEDICATION_STORAGE_KEY)||'[]')
 const records=readPharmacy().administrations||[]
 return orders.map(order=>records.find(record=>record.id===order.id)||order)
}
export function writePharmacy(state:PharmacyState){localStorage.setItem(PHARMACY_KEY,JSON.stringify(state));window.dispatchEvent(new Event(PHARMACY_EVENT))}
export async function pharmacyLock<T>(run:()=>T|Promise<T>):Promise<T>{return navigator.locks? navigator.locks.request('medrisk-pharmacy',run):run()}
export async function medicationPharmacyLock<T>(run:()=>T|Promise<T>):Promise<T>{return navigator.locks?navigator.locks.request('medrisk-medications',()=>pharmacyLock(run)):run()}
