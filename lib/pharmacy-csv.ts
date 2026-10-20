import type {User} from './types'
import {type PharmacyState,enterStock,removeStock,normalizeCnpj} from './pharmacy'
import {csvValue} from './report-export'
export const MOVEMENT_HEADERS=['id','tipo','codigo_produto','lote','localizacao','validade','quantidade','fornecedor_cnpj','programa','motivo','destinacao','data']
export function parsePharmacyCsv(content:string):string[][] {
 const input=content.replace(/^\uFEFF/,'');if(input.length>2_000_000)throw new Error('O CSV deve ter no máximo 2 MB.')
 const separator=input.slice(0,input.indexOf('\n')<0?undefined:input.indexOf('\n')).includes(';')?';':','
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;let closed=false
 for(let i=0;i<input.length;i++){const ch=input[i];if(quoted){if(ch==='"'&&input[i+1]==='"'){cell+='"';i++}else if(ch==='"'){quoted=false;closed=true}else cell+=ch;continue}
  if(ch==='"'){if(cell||closed)throw new Error('Aspas inválidas no CSV.');quoted=true}else if(ch===separator){row.push(cell);cell='';closed=false}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&input[i+1]==='\n')i++;row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';closed=false}else{if(closed&&!/\s/.test(ch))throw new Error('Conteúdo inválido após aspas no CSV.');if(!closed)cell+=ch}
 }
 if(quoted)throw new Error('Aspas não fechadas no CSV.');row.push(cell);if(row.some(value=>value.trim()))rows.push(row)
 if(rows.length>5001)throw new Error('Importe até 5.000 movimentações por arquivo.');return rows
}
export function importPharmacyMovements(state:PharmacyState,content:string,user:User):{state:PharmacyState;imported:number;skipped:number} {
 const [headers,...rows]=parsePharmacyCsv(content)
 if(!headers||MOVEMENT_HEADERS.some(column=>!headers.includes(column))||new Set(headers).size!==headers.length)throw new Error('Cabeçalho inválido. Utilize o modelo CSV de movimentações.')
 if(!rows.length)throw new Error('O arquivo não contém movimentações.')
 let next=state;let imported=0;let skipped=0
 for(let i=0;i<rows.length;i++){try{
  if(rows[i].length!==headers.length)throw new Error('Quantidade de colunas inválida.')
  const values=Object.fromEntries(headers.map((column,index)=>[column,rows[i][index].trim()]))
  if(!values.id)throw new Error('Informe um identificador único na coluna id.')
  if(values.id&&next.movements.some(item=>item.id===values.id)){skipped++;continue}
  if(!['entrada','saida','descarte'].includes(values.tipo))throw new Error('Importe somente entrada, saida ou descarte. Administrações são registradas pela enfermagem.')
  const product=next.products.find(item=>item.code.toLowerCase()===values.codigo_produto.toLowerCase())
  if(!product)throw new Error('Código de produto não encontrado.')
  if(!/^\d+$/.test(values.quantidade))throw new Error('Quantidade inválida.')
  const supplier=values.fornecedor_cnpj?next.suppliers.find(item=>item.cnpj===normalizeCnpj(values.fornecedor_cnpj)):undefined
  const program=values.programa?next.programs.find(item=>item.name.toLowerCase()===values.programa.toLowerCase()):undefined
  if(values.fornecedor_cnpj&&!supplier)throw new Error('Fornecedor não encontrado pelo CNPJ.')
  if(values.programa&&!program)throw new Error('Programa não encontrado.')
  if(values.tipo==='entrada')next=enterStock(next,{productId:product.id,lot:values.lote,location:values.localizacao,expiry:values.validade,quantity:Number(values.quantidade),supplierId:supplier?.id,programId:program?.id,reason:values.motivo,at:values.data||undefined,movementId:values.id||undefined},user)
  else {const lot=next.lots.find(item=>item.productId===product.id&&item.lot===values.lote&&item.location===values.localizacao&&item.expiry===values.validade&&item.supplierId===supplier?.id&&item.programId===program?.id);if(!lot)throw new Error('Lote não encontrado.');next=removeStock(next,lot.id,Number(values.quantidade),values.motivo,values.destinacao,user,values.tipo as 'saida'|'descarte',values.id||undefined,values.data||undefined)}
  imported++
 }catch(error){throw new Error(`Linha ${i+2}: ${error instanceof Error?error.message:'Dados inválidos.'} Nenhuma movimentação foi importada.`)}}
 return {state:next,imported,skipped}
}
export function pharmacyCsv(headers:string[],rows:(string|number)[][]):string{return '\uFEFF'+[headers,...rows].map(row=>row.map(csvValue).join(';')).join('\r\n')}
export function movementRows(state:PharmacyState,kind?:'entrada'|'saidas'){
 return state.movements.filter(item=>!kind||(kind==='entrada'?item.kind==='entrada':item.kind!=='entrada')).map(movement=>{const lot=state.lots.find(item=>item.id===movement.lotId)!;return [movement.id,movement.kind,state.products.find(item=>item.id===movement.productId)?.code||'',lot.lot,lot.location,lot.expiry,movement.quantity,state.suppliers.find(item=>item.id===lot.supplierId)?.cnpj||'',state.programs.find(item=>item.id===lot.programId)?.name||'',movement.reason,movement.destination||'',movement.at]})
}
