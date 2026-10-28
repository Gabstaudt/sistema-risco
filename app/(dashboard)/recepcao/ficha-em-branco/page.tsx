'use client'
import {useAuth} from '@/lib/auth'
import {Button} from '@/components/ui/button'
import {UnitBrand} from '@/components/shared/unit-brand'
export default function BlankAttendance(){
 const {hasPermission}=useAuth()
 if(!hasPermission('print_blank_attendance'))return <p className="p-6">Sem permissão para imprimir esta ficha.</p>
 return <main className="w-full min-w-0 p-4 sm:p-6"><style>{`
 .blank-preview{width:100%;overflow-x:auto;padding-bottom:1rem}
 .blank-sheet{box-sizing:border-box;width:210mm;height:297mm;margin-inline:auto;display:flex;flex-direction:column;gap:3mm;padding:12mm;font-size:10pt;line-height:1.3;flex-shrink:0}
 .blank-sheet > *{flex-shrink:0}
 .blank-sheet .blank-signature{margin-top:auto}
 .blank-sheet .brand-logo{width:45mm;height:11mm;padding:0}
 .blank-sheet h1{font-size:15pt;line-height:1.2}
 .blank-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:6mm;row-gap:2mm;font-size:9pt}
 .blank-field{min-height:9mm;border-bottom:1px solid #94a3b8}
 .blank-notes h2{font-size:10pt;font-weight:600;line-height:1.3}
 .blank-writing{height:24mm;border-bottom:1px solid #94a3b8}
 .blank-signature{padding-top:5mm;text-align:center;font-size:9pt}
 @media print{
  @page{size:A4 portrait;margin:12mm}
  [data-slot="sidebar"],[data-slot="sidebar-container"],[data-slot="sidebar-gap"],header,.print-actions{display:none!important}
  html,body{display:block!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;background:white!important}
  [data-slot="sidebar-wrapper"],[data-slot="sidebar-inset"]{display:block!important;min-height:0!important;height:auto!important;width:100%!important;margin:0!important}
  .blank-preview{overflow:visible;padding:0;margin:0}
  main{display:block!important;padding:0!important;min-height:0!important;height:auto!important;margin:0!important}
  .blank-sheet{width:186mm;height:270mm;max-width:none;margin:0;border:0!important;border-radius:0;padding:0;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
 }
 `}</style><div className="print-actions mb-5"><Button className="h-12" onClick={()=>window.print()}>Imprimir ficha em branco</Button></div><div className="blank-preview"><article className="blank-sheet mx-auto rounded-lg border bg-white text-black"><UnitBrand compact/><h1 className="text-xl font-bold">Ficha de atendimento</h1><div className="blank-fields">{['Data / hora','Senha / prontuário','Nome completo','Nome social','Data de nascimento','Sexo','CPF','CNS','Nome da mãe','Nome do pai','Responsável / contato','Telefone','Endereço','Profissional / setor'].map(label=><div key={label} className="blank-field">{label}:</div>)}</div><p className="text-sm">Encaminhamento: ☐ Com triagem　 ☐ Sem triagem / branca</p>{['Queixa / motivo do atendimento','Sinais vitais e observações da triagem','Avaliação / evolução','Conduta / solicitações'].map(label=><section className="blank-notes" key={label}><h2 className="text-sm font-semibold">{label}</h2><div className="blank-writing"/></section>)}<div className="blank-signature">Assinatura e identificação do profissional: ____________________________________</div></article></div></main>
}
