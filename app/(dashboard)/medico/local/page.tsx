import {Header} from '@/components/layout/header'
import {DoctorWorkplace} from '@/components/shared/doctor-workplace'
export default function Page(){return <><Header breadcrumbs={[{label:'Local de atendimento'}]}/><main className="w-full space-y-5 p-4 sm:p-6"><h1 className="text-2xl font-bold">Meu consultório e setor</h1><DoctorWorkplace/></main></>}
