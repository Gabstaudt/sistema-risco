'use client'
import Link from 'next/link'
import {useAuth} from '@/lib/auth'
import {Button} from '@/components/ui/button'
import {DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem} from '@/components/ui/dropdown-menu'
export const RECEPTION_SHEETS={ficha_normal:'Ficha normal',ficha_urgencia:'Ficha de urgência',ficha_ambulatorial:'Ficha ambulatorial'} as const
export function ReceptionPrintActions({patientId,compact=false}:{patientId:string;compact?:boolean}){const {hasPermission}=useAuth();if(!['print_blank_attendance','print_patient_record','print_triage_sheet'].some(hasPermission))return null
 if(compact)return <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-11">Imprimir ficha</Button></DropdownMenuTrigger><DropdownMenuContent align="end">{Object.entries(RECEPTION_SHEETS).map(([kind,label])=><DropdownMenuItem key={kind} asChild><Link href={`/paciente/${patientId}/imprimir?tipo=${kind}`} target="_blank">{label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>
 return <div className="flex flex-wrap gap-2 print:hidden">{Object.entries(RECEPTION_SHEETS).map(([kind,label])=><Button key={kind} asChild variant="outline" className="h-12"><Link href={`/paciente/${patientId}/imprimir?tipo=${kind}`} target="_blank">Imprimir {label.toLocaleLowerCase('pt-BR')}</Link></Button>)}</div>
}
