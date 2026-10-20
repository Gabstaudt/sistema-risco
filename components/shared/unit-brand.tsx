'use client'
import {BrandLogo} from './brand-logo'
import {useUnit} from '@/lib/use-unit'
export function UnitBrand({compact=false}:{compact?:boolean}){const {unit}=useUnit();return <div className="flex items-center justify-between gap-4"><BrandLogo className="w-40 shrink-0"/>{unit.updatedAt&&<div className="flex min-w-0 items-center gap-3">{unit.logo&&<img src={unit.logo} alt={`Logo ${unit.name}`} className="h-10 w-14 shrink-0 object-contain"/>}<div className="min-w-0 text-right"><p className={compact?'text-xs font-semibold':'text-sm font-semibold'}>{unit.name}</p>{unit.cnes&&<p className="text-xs">CNES {unit.cnes}</p>}{!compact&&unit.municipality&&<p className="text-xs">{unit.municipality}{unit.uf?` / ${unit.uf}`:''}</p>}</div></div>}</div>}
