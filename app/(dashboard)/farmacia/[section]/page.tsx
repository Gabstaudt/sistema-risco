import {notFound} from 'next/navigation'
import {PharmacyModule} from '@/components/shared/pharmacy-module'
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!['fornecedores','produtos','programas','movimentacoes','separacao','vencidos'].includes(section))notFound();return <PharmacyModule section={section}/>}
