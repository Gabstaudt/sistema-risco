'use client'
import {useState} from 'react'
import Link from 'next/link'
import {useAuth} from '@/lib/auth'
import {useData} from '@/lib/data-context'
import {Button} from '@/components/ui/button'
export function ReceptionTicketSelector(){const {user}=useAuth();const {tickets,callTicket}=useData();const [busy,setBusy]=useState(false);const [error,setError]=useState('');if(user?.role!=='recepcao')return null;const called=tickets.find(ticket=>ticket.stage==='chamada_recepcao'&&ticket.calledBy===user.id);const waiting=tickets.some(ticket=>ticket.stage==='aguardando_recepcao');return <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4"><div><p className="font-semibold">{called?`Senha chamada: ${called.number}`:'Chamar senha para este atendimento'}</p>{error&&<p role="alert" className="text-destructive">{error}</p>}</div>{!called&&<div className="flex flex-wrap gap-2"><Button type="button" className="h-12" disabled={busy||!waiting} onClick={async()=>{if(busy)return;setBusy(true);setError('');try{await callTicket('recepcao')}catch(error){setError(error instanceof Error?error.message:'Não foi possível chamar.')}finally{setBusy(false)}}}>Chamar próxima senha</Button><Button asChild variant="outline" className="h-12"><Link href="/recepcao/fila">Abrir chamada de senhas</Link></Button></div>}</div>}
