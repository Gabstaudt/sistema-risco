'use client'
import {useUnit} from '@/lib/use-unit'
import {usePharmacy} from '@/lib/use-pharmacy'
import {useProduction} from '@/lib/use-production'
import {extendedAdministrationReports,municipalityOccurrences} from '@/lib/admin-reports'
import {UnitBrand} from './unit-brand'
import { useMemo,useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { useData } from '@/lib/data-context'
import { administrationReports,summarizeAdministration,presetRange,validRange,PERIODS,type PeriodPreset,type DateRange } from '@/lib/admin-analytics'
import { summarizeSurgeries } from '@/lib/surgery-records'
import { exportCsv,downloadReport,type ReportTable } from '@/lib/report-export'
import { ROLE_LABELS } from '@/lib/types'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card,CardHeader,CardTitle,CardContent } from '@/components/ui/card'
import { Table,TableHeader,TableHead,TableBody,TableRow,TableCell } from '@/components/ui/table'
import { inRange } from '@/lib/admin-analytics'
function Ranking({title,rows}:{title:string;rows:{name:string;count:number}[]}){return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><ol className="space-y-4">{rows.slice(0,10).map((row,index)=><li key={`${row.name}-${index}`} className="space-y-2"><div className="flex justify-between gap-3 text-sm"><span className="break-words">{index+1}. {row.name}</span><strong>{row.count}</strong></div><progress className="h-2 w-full accent-primary" value={row.count} max={rows[0]?.count||1} aria-label={`${row.name}: ${row.count}`}/></li>)}</ol>{!rows.length&&<p className="py-5 text-sm text-muted-foreground">Sem registros no período.</p>}</CardContent></Card>}
export function AdminOverview({reportsOnly=false}:{reportsOnly?:boolean}){
 const {unit}=useUnit();const {state:pharmacy}=usePharmacy();const {codings}=useProduction()
 const query=useSearchParams();const {users,profiles,hasPermission}=useAuth();const {patients,examRequests,medicationOrders,auditLogs,examTypes,isDataReady}=useData()
 const [preset,setPreset]=useState<PeriodPreset>(query.get('from')?'custom':'today')
 const [range,setRange]=useState<DateRange>(()=>query.get('from')?{from:query.get('from')||'',to:query.get('to')||''}:presetRange('today'))
 const [report,setReport]=useState(query.get('report')||'all')
 const valid=validRange(range)
 const summary=useMemo(()=>summarizeAdministration({patients,exams:examRequests,medications:medicationOrders,audit:auditLogs,users},range),[patients,examRequests,medicationOrders,auditLogs,users,range])
 const reports=useMemo(()=>{
  const tables=administrationReports(summary,range);const surgeries=summarizeSurgeries(patients,range.from,range.to)
  tables.cirurgias={title:'Cirurgias realizadas',headers:['Paciente','Procedimento','Segmento','Data'],rows:surgeries.rows.map(({patientName,record})=>[patientName,record.procedureType,record.segment,record.performedAt||''])}
  tables.auditoria={title:'Auditoria no período',headers:['Data','Profissional','Ação','Descrição'],rows:auditLogs.filter(log=>inRange(log.timestamp,range)).map(log=>[log.timestamp,log.userName,log.action,log.details||log.description])}
  tables.usuarios={title:'Cadastro atual de usuários',headers:['Nome','E-mail','Perfil','Tipo','Situação'],rows:users.map(user=>[user.name,user.email,profiles.find(profile=>profile.id===user.profileId)?.name||'',ROLE_LABELS[user.role],user.active?'Ativo':'Inativo'])}
  tables.perfis={title:'Perfis e permissões atuais',headers:['Perfil','Tipo','Situação','Permissões'],rows:profiles.map(profile=>[profile.name,ROLE_LABELS[profile.role],profile.active?'Ativo':'Inativo',profile.permissions.join(', ')])}
  tables.catalogo={title:'Catálogo atual de exames',headers:['Exame','Categoria','Formato'],rows:examTypes.map(exam=>[exam.name,exam.category,exam.resultMode||'single_file'])}
  Object.assign(tables,extendedAdministrationReports(summary,patients,users,pharmacy,codings,unit,range))
  return tables
 },[summary,range,patients,auditLogs,users,profiles,examTypes,pharmacy,codings,unit])
 const selected:ReportTable[]=report==='all'?Object.values(reports):reports[report]?[reports[report]]:[]
 function choose(value:PeriodPreset){setPreset(value);if(value!=='custom')setRange(presetRange(value))}
 function exportFile(format:'csv'|'json'){if(!valid||!hasPermission('view_reports'))return;const filename=`medrisk-${report}-${range.from}-${range.to}`;if(format==='csv')exportCsv(filename,selected);else downloadReport(filename+'.json',JSON.stringify({periodo:range,relatorios:selected},null,2),'application/json')}
 if(!isDataReady)return <p className="p-6">Carregando...</p>
 return <><Header breadcrumbs={[{label:reportsOnly?'Relatórios':'Visão administrativa'}]} /><main className="min-w-0 w-full flex-1 space-y-5 p-4 sm:p-6">
  <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><h1 className="text-2xl font-bold">{reportsOnly?'Relatórios administrativos':'Visão administrativa'}</h1><div className="flex flex-wrap gap-2">{hasPermission('manage_users')&&<Button asChild variant="outline" className="h-11"><Link href="/admin/usuarios">Usuários</Link></Button>}{hasPermission('manage_profiles')&&hasPermission('system_settings')&&<Button asChild variant="outline" className="h-11"><Link href="/admin/configuracoes">Perfis e permissões</Link></Button>}{hasPermission('create_exam_type')&&<Button asChild variant="outline" className="h-11"><Link href="/admin/exames">Exames</Link></Button>}</div></div>
  {!reportsOnly&&unit.image&&<div className="flex items-center gap-4 rounded-xl border bg-card p-3 print:hidden"><img src={unit.image} alt={`Imagem ${unit.name}`} className="h-20 w-28 rounded-lg object-cover"/>{unit.logo&&<img src={unit.logo} alt={`Logo ${unit.name}`} className="h-12 w-16 object-contain"/>}<p className="font-semibold">{unit.name}</p></div>}
  <Card className="print:hidden"><CardHeader><CardTitle>Período</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{PERIODS.map(item=><Button key={item.id} variant={preset===item.id?'default':'outline'} className="h-11" aria-pressed={preset===item.id} onClick={()=>choose(item.id)}>{item.label}</Button>)}</div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="report-from">De</Label><Input id="report-from" className="h-12" type="date" value={range.from} onChange={event=>{setPreset('custom');setRange({...range,from:event.target.value})}}/></div><div className="space-y-2"><Label htmlFor="report-to">Até</Label><Input id="report-to" className="h-12" type="date" value={range.to} onChange={event=>{setPreset('custom');setRange({...range,to:event.target.value})}}/></div></div></CardContent></Card>
  {!valid&&<p role="alert" className="text-destructive">Informe as duas datas; a data inicial deve ser anterior ou igual à final.</p>}
  {valid&&!reportsOnly&&<div className="space-y-5 print:hidden">
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Entradas no período',value:summary.visits.length,title:'Entradas hospitalares, incluindo retornos em entradas diferentes.'},{label:'Pacientes atendidos',value:summary.patientsAttended,title:'Pacientes distintos com avaliação médica concluída no período.'},{label:'Avaliações médicas concluídas',value:summary.medical.length,title:'Uma avaliação por especialidade e entrada; rascunhos não entram na contagem.'},{label:'Exames realizados',value:summary.performed.length,title:'Exames com data de realização ou análise registrada no período.'}].map(card=><Card key={card.label}><CardContent className="p-5"><p className="text-sm text-muted-foreground" title={card.title}>{card.label}</p><p className="mt-2 text-3xl font-bold">{card.value}</p></CardContent></Card>)}</div>
   <Card><CardHeader><CardTitle>Atendimentos por classificação</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{summary.classifications.map(row=><div key={row.priority} className={`rounded-xl border p-4 ${row.className}`}><p className="font-medium">{row.label}</p><p className="mt-2 text-3xl font-bold">{row.count}</p><p className="mt-1 text-sm">{summary.visits.length?Math.round(row.count/summary.visits.length*100):0}% das entradas</p></div>)}</div></CardContent></Card>
   <div className="grid gap-4 xl:grid-cols-2"><Ranking title="Ocorrências por município de origem" rows={municipalityOccurrences(summary)}/><Card><CardHeader><CardTitle>Pacientes cadastrados</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-3xl font-bold">{patients.length}</p><Button asChild className="h-12"><Link href="/admin/pacientes">Visualizar pacientes cadastrados</Link></Button><Button asChild variant="outline" className="h-12"><Link href={`/admin/relatorios?from=${range.from}&to=${range.to}&report=faixas_etarias`}>Ocorrências por faixa etária</Link></Button></CardContent></Card></div>
   <div className="grid gap-4 xl:grid-cols-3"><Ranking title="Médicos com mais atendimentos" rows={summary.doctors}/><Ranking title="Exames mais realizados" rows={summary.examRanking}/><Ranking title="Medicações mais utilizadas" rows={summary.medicationRanking}/></div>
   <Card><CardHeader><CardTitle>Tempo médio de espera por setor</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{summary.waits.map(row=><div key={row.sector} className="rounded-lg border p-4"><p className="font-medium">{row.label}</p><p className="mt-2 text-2xl font-bold">{row.minutes===null?'Sem registros':row.minutes>0&&row.minutes<1?'<1 min':`${Math.round(row.minutes)} min`}</p><p className="mt-1 text-xs text-muted-foreground">{row.samples} {row.sector==='laboratorio'?'exame(s)':'atendimento(s)'} com início registrado</p></div>)}</div></CardContent></Card>
  </div>}
  {hasPermission('view_reports')&&<Card className="print:hidden"><CardHeader><CardTitle>Exportar relatórios</CardTitle></CardHeader><CardContent className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1 space-y-2"><Label htmlFor="report-kind">Relatório</Label><select id="report-kind" className="h-12 w-full rounded-md border bg-background px-3" value={report} onChange={event=>setReport(event.target.value)}><option value="all">Relatório completo</option>{Object.entries(reports).map(([id,table])=><option key={id} value={id}>{table.title.split(' · ')[0]}</option>)}</select></div><Button className="h-12" disabled={!valid} onClick={()=>exportFile('csv')}>Exportar CSV</Button><Button className="h-12" variant="outline" disabled={!valid} onClick={()=>exportFile('json')}>Exportar JSON</Button><Button className="h-12" variant="outline" disabled={!valid} onClick={()=>window.print()}>Imprimir / PDF</Button>{!reportsOnly&&<Button asChild variant="outline" className="h-12"><Link href={`/admin/relatorios?from=${range.from}&to=${range.to}&report=${report}`}>Ver relatório</Link></Button>}</CardContent></Card>}
  {valid&&hasPermission('view_reports')&&(report==='bpa'||reportsOnly&&report==='all')&&<div className="space-y-3 rounded-lg border bg-card p-4 print:hidden"><p>BPA: relatório de conferência cadastral. A validação dos procedimentos e o arquivo oficial do SIA dependem da modalidade e da competência.</p><Button asChild variant="outline"><Link href="/admin/producao">Configurar produção / BPA</Link></Button></div>}
  {valid&&hasPermission('view_reports')&&<section className={reportsOnly?'admin-report space-y-6':'admin-report hidden space-y-6 print:block'}>
   <style>{`@media print { [data-slot="sidebar"], [data-slot="sidebar-gap"], [data-slot="sidebar-container"], header { display:none !important; } .admin-report { color:black; background:white; } [data-slot="sidebar-inset"] { margin:0 !important; } table { font-size:10px; } th,td { white-space:normal !important; overflow-wrap:anywhere; } [data-slot="table-container"] { overflow:visible !important; } @page { size:A4 landscape; margin:12mm; } }`}</style>
   <UnitBrand/><div><h2 className="text-2xl font-bold">Relatório administrativo</h2><p>{range.from.split('-').reverse().join('/')} a {range.to.split('-').reverse().join('/')}</p></div>
   {selected.map(table=><div key={table.title} className="space-y-3"><h3 className="text-lg font-semibold">{table.title}</h3><Table><TableHeader><TableRow>{table.headers.map(header=><TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader><TableBody>{table.rows.map((row,index)=><TableRow key={index}>{row.map((value,column)=><TableCell key={column} className="max-w-md whitespace-pre-wrap break-words">{value}</TableCell>)}</TableRow>)}{!table.rows.length&&<TableRow><TableCell colSpan={table.headers.length} className="text-muted-foreground">Sem registros no período.</TableCell></TableRow>}</TableBody></Table></div>)}
  </section>}
 </main></>
}
