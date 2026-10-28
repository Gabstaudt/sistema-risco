'use client'
import {useRouter} from 'next/navigation'
import {useAuth} from '@/lib/auth'
import {Button} from '@/components/ui/button'
export function ProfilePreviewBanner(){const {preview,profiles,user,stopPreview}=useAuth();const router=useRouter();if(!preview)return null;return <div role="status" className="flex flex-wrap items-center justify-between gap-3 border-b bg-amber-50 px-4 py-3 text-amber-950 print:hidden"><p><strong>Visualizando: {profiles.find(profile=>profile.id===preview.profileId)?.name}</strong> · Somente consulta{user?.previewMode?` · ${user.name}`:''}</p><Button variant="outline" className="h-11" onClick={()=>{stopPreview();router.push('/admin')}}>Voltar ao administrador</Button></div>}
