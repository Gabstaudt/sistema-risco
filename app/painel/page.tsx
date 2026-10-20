'use client'
import { useData } from '@/lib/data-context'
import { BrandLogo } from '@/components/shared/brand-logo'
const stages = [{ stage: 'recepcao', title: 'Recepção' }, { stage: 'triagem', title: 'Triagem' }, { stage: 'clinico', title: 'Consultório' }]
export default function CallPanel() {
 const { publicCalls } = useData()
 const calls = [...publicCalls].sort((a,b) => Date.parse(b.calledAt || '') - Date.parse(a.calledAt || ''))
 const latest = calls[0]
 return <main className="min-h-svh space-y-8 bg-background p-6 sm:p-10">
  <header className="flex flex-wrap items-center justify-between gap-4"><BrandLogo className="w-52" /><h1 className="text-2xl font-bold">Painel de chamadas</h1></header>
  <section className="rounded-2xl border-2 border-primary bg-primary/5 p-8 text-center" aria-live="polite"><h2 className="text-xl font-semibold">Última chamada</h2>{latest ? <><p className="my-4 font-mono text-7xl font-bold sm:text-9xl">{latest.number}</p><p className="text-2xl font-semibold">{stages.find(item => (latest.stage === 'chamada_medico'&&item.stage==='clinico')||latest.stage === `chamada_${item.stage}`)?.title}{latest.destination ? ` · ${latest.destination}` : ''}</p></> : <p className="py-10 text-xl text-muted-foreground">Aguarde a próxima chamada.</p>}</section>
  <div className="grid gap-5 lg:grid-cols-3">{stages.map(({ stage, title }) => <section key={stage} className="rounded-xl border bg-card p-5"><h2 className="mb-4 text-xl font-bold">{title}</h2><ul className="divide-y">{calls.filter(call => call.stage === `chamada_${stage}`||(stage==='clinico'&&call.stage==='chamada_medico')).map(call => <li key={`${call.day}-${call.number}`} className="flex flex-wrap items-center justify-between gap-3 py-3"><strong className="font-mono text-3xl">{call.number}</strong><span>{call.destination || title}</span></li>)}</ul>{!calls.some(call => call.stage === `chamada_${stage}`||(stage==='clinico'&&call.stage==='chamada_medico')) && <p className="text-muted-foreground">Sem chamada no momento.</p>}</section>)}</div>
 </main>
}
