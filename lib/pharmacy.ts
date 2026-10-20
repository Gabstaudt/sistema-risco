import type {MedicationOrder, User} from './types'
import {hasUserPermission} from './permissions'
export const PHARMACY_KEY='medrisk-pharmacy'
export const MEDICATION_STORAGE_KEY='hospital-medication-orders'
export interface Supplier {id:string;name:string;cnpj:string;phone:string;email:string;address:string;active:boolean}
export interface HealthProgram {id:string;name:string;description:string;active:boolean}
export interface PharmacyProduct {id:string;code:string;name:string;unit:string;minimum:number;expiryAlertDays:number;active:boolean}
export interface StockLot {id:string;productId:string;lot:string;location:string;expiry:string;quantity:number;supplierId?:string;programId?:string;enteredAt:string}
export interface StockMovement {id:string;kind:'entrada'|'saida'|'administracao'|'descarte';lotId:string;productId:string;quantity:number;at:string;recordedAt:string;by:string;reason:string;destination?:string;orderId?:string}
export interface MedicationSeparation {id:string;orderId:string;lotId:string;quantity:number;at:string;by:string;status:'separada'|'administrada'|'cancelada';cancelledReason?:string}
export interface PharmacyEvent {id:string;at:string;by:string;action:string;details?:string}
export interface PharmacyState {events?:PharmacyEvent[];administrations?:MedicationOrder[];suppliers:Supplier[];programs:HealthProgram[];products:PharmacyProduct[];lots:StockLot[];movements:StockMovement[];separations:MedicationSeparation[]}
export const emptyPharmacy=():PharmacyState=>({suppliers:[],programs:[],products:[],lots:[],movements:[],separations:[]})
export const pharmacyDay=(date=new Date())=>date.toLocaleDateString('en-CA',{timeZone:'America/Belem'})
export const normalizeCnpj=(value:string)=>value.replace(/[^a-z\d]/gi,'').toUpperCase()
const id=()=>crypto.randomUUID()
function assertManager(user:User){if(!hasUserPermission(user,'manage_pharmacy'))throw new Error('Sem permissão para gerenciar a farmácia.')}
function quantity(value:number){if(!Number.isSafeInteger(value)||value<=0)throw new Error('Informe uma quantidade inteira maior que zero.')}
function validDay(value:string){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
export function reconcileSeparations(state:PharmacyState,orders:MedicationOrder[]):PharmacyState {
 return {...state,separations:state.separations.map(separation=>separation.status==='separada'&&orders.find(order=>order.id===separation.orderId)?.status!=='solicitada'?{...separation,status:'cancelada',cancelledReason:'Solicitação encerrada ou cancelada.'}:separation)}
}
export function reservedQuantity(state:PharmacyState,lotId:string){return state.separations.filter(item=>item.lotId===lotId&&item.status==='separada').reduce((sum,item)=>sum+item.quantity,0)}
export function availableQuantity(state:PharmacyState,lot:StockLot){return lot.quantity-reservedQuantity(state,lot.id)}
export function productAvailable(state:PharmacyState,productId:string,today=pharmacyDay()){return state.lots.filter(lot=>lot.productId===productId&&lot.expiry>=today).reduce((sum,lot)=>sum+availableQuantity(state,lot),0)}
export function saveSupplier(state:PharmacyState,draft:Omit<Supplier,'id'>,user:User,supplierId?:string):PharmacyState {
 assertManager(user);const cnpj=normalizeCnpj(draft.cnpj)
 if(!draft.name.trim()||cnpj.length!==14)throw new Error('Informe o nome e o CNPJ com 14 caracteres.')
 if(state.suppliers.some(item=>item.id!==supplierId&&item.cnpj===cnpj))throw new Error('Fornecedor já cadastrado com esse CNPJ.')
 if(supplierId&&!state.suppliers.some(item=>item.id===supplierId))throw new Error('Fornecedor não encontrado.')
 const supplier={...draft,id:supplierId||id(),name:draft.name.trim(),cnpj}
 return {...state,suppliers:[...state.suppliers.filter(item=>item.id!==supplier.id),supplier]}
}
export function saveProduct(state:PharmacyState,draft:Omit<PharmacyProduct,'id'>,user:User,productId?:string):PharmacyState {
 assertManager(user)
 if(!draft.name.trim()||!draft.unit.trim()||!/^[a-z\d][a-z\d._-]*$/i.test(draft.code.trim()))throw new Error('Informe nome, unidade e código válido do produto.')
 if(!Number.isSafeInteger(draft.minimum)||draft.minimum<0||!Number.isSafeInteger(draft.expiryAlertDays)||draft.expiryAlertDays<0)throw new Error('Estoque mínimo e dias de alerta devem ser inteiros a partir de zero.')
 if(state.products.some(item=>item.id!==productId&&item.code.toLowerCase()===draft.code.trim().toLowerCase()))throw new Error('Código de produto já cadastrado.')
 if(productId&&!state.products.some(item=>item.id===productId))throw new Error('Produto não encontrado.')
 const product={...draft,id:productId||id(),name:draft.name.trim(),code:draft.code.trim(),unit:draft.unit.trim()}
 return {...state,products:[...state.products.filter(item=>item.id!==product.id),product]}
}
export function saveProgram(state:PharmacyState,draft:Omit<HealthProgram,'id'>,user:User,programId?:string):PharmacyState {
 assertManager(user);if(!draft.name.trim())throw new Error('Informe o nome do programa.')
 if(state.programs.some(item=>item.id!==programId&&item.name.trim().toLowerCase()===draft.name.trim().toLowerCase()))throw new Error('Programa já cadastrado.')
 if(programId&&!state.programs.some(item=>item.id===programId))throw new Error('Programa não encontrado.')
 const program={...draft,id:programId||id(),name:draft.name.trim()};return {...state,programs:[...state.programs.filter(item=>item.id!==program.id),program]}
}
export interface StockEntryDraft {productId:string;lot:string;location:string;expiry:string;quantity:number;supplierId?:string;programId?:string;reason:string;at?:string;movementId?:string}
export function enterStock(state:PharmacyState,draft:StockEntryDraft,user:User):PharmacyState {
 assertManager(user);quantity(draft.quantity)
 if(!state.products.some(product=>product.id===draft.productId&&product.active))throw new Error('Selecione um produto ativo.')
 if(!draft.lot.trim()||!draft.location.trim()||!validDay(draft.expiry)||!draft.reason.trim())throw new Error('Informe lote, localização, validade e motivo da entrada.')
 if(draft.supplierId&&!state.suppliers.some(item=>item.id===draft.supplierId&&item.active))throw new Error('Fornecedor inválido ou inativo.')
 if(draft.programId&&!state.programs.some(item=>item.id===draft.programId&&item.active))throw new Error('Programa inválido ou inativo.')
 const now=new Date().toISOString();const at=draft.at||now;if(!Number.isFinite(Date.parse(at))||Date.parse(at)>Date.now()+1000)throw new Error('Informe uma data de entrada válida, sem data futura.')
 const existing=state.lots.find(lot=>lot.productId===draft.productId&&lot.lot===draft.lot.trim()&&lot.location===draft.location.trim()&&lot.supplierId===(draft.supplierId||undefined)&&lot.programId===(draft.programId||undefined))
 if(existing&&existing.expiry!==draft.expiry)throw new Error('O lote já existe com outra validade.')
 if(existing&&!Number.isSafeInteger(existing.quantity+draft.quantity))throw new Error('Quantidade acima do limite permitido.')
 const lot:StockLot=existing?{...existing,quantity:existing.quantity+draft.quantity}:{id:id(),productId:draft.productId,lot:draft.lot.trim(),location:draft.location.trim(),expiry:draft.expiry,quantity:draft.quantity,supplierId:draft.supplierId||undefined,programId:draft.programId||undefined,enteredAt:at}
 const movement:StockMovement={id:draft.movementId||id(),kind:'entrada',lotId:lot.id,productId:lot.productId,quantity:draft.quantity,at,recordedAt:now,by:user.id,reason:draft.reason.trim()}
 if(state.movements.some(item=>item.id===movement.id))throw new Error('Movimentação já registrada.')
 return {...state,lots:existing?state.lots.map(item=>item.id===lot.id?lot:item):[...state.lots,lot],movements:[...state.movements,movement]}
}
export function removeStock(state:PharmacyState,lotId:string,amount:number,reason:string,destination:string,user:User,kind:'saida'|'descarte'='saida',movementId?:string,at?:string):PharmacyState {
 assertManager(user);quantity(amount);const lot=state.lots.find(item=>item.id===lotId)
 if(!lot)throw new Error('Lote não encontrado.')
 if(!reason.trim()||!destination.trim())throw new Error('Informe a justificativa e a destinação da baixa.')
 if(kind==='saida'&&lot.expiry<pharmacyDay())throw new Error('Medicamento vencido: registre o descarte e sua destinação.')
 if(amount>availableQuantity(state,lot))throw new Error('Saldo insuficiente ou reservado para administração.')
 const now=new Date().toISOString();const occurredAt=at||now
 if(!Number.isFinite(Date.parse(occurredAt))||Date.parse(occurredAt)>Date.now()+1000||Date.parse(occurredAt)<Date.parse(lot.enteredAt))throw new Error('Data da saída inválida ou anterior à entrada.')
 const movement:StockMovement={id:movementId||id(),kind,lotId,productId:lot.productId,quantity:amount,reason:reason.trim(),destination:destination.trim(),at:occurredAt,recordedAt:now,by:user.id}
 if(state.movements.some(item=>item.id===movement.id))throw new Error('Movimentação já registrada.')
 return {...state,lots:state.lots.map(item=>item.id===lotId?{...item,quantity:item.quantity-amount}:item),movements:[...state.movements,movement]}
}
export function separateMedication(state:PharmacyState,order:MedicationOrder,lotId:string,amount:number,user:User):PharmacyState {
 assertManager(user);quantity(amount)
 if(order.status!=='solicitada')throw new Error('A solicitação não está aguardando administração.')
 if(state.separations.some(item=>item.orderId===order.id&&item.status!=='cancelada'))throw new Error('Esta medicação já foi separada.')
 const lot=state.lots.find(item=>item.id===lotId)
 if(!lot||!state.products.some(product=>product.id===lot.productId&&product.active)||lot.expiry<pharmacyDay())throw new Error('Selecione um lote válido, ativo e não vencido.')
 if(amount>availableQuantity(state,lot))throw new Error('Saldo disponível insuficiente.')
 return {...state,separations:[...state.separations,{id:id(),orderId:order.id,lotId,quantity:amount,at:new Date().toISOString(),by:user.id,status:'separada'}]}
}
export function cancelSeparation(state:PharmacyState,separationId:string,reason:string,user:User):PharmacyState {
 assertManager(user);const separation=state.separations.find(item=>item.id===separationId)
 if(!separation||separation.status!=='separada')throw new Error('Separação não está disponível para cancelamento.')
 if(!reason.trim())throw new Error('Informe a justificativa do cancelamento.')
 return {...state,separations:state.separations.map(item=>item.id===separationId?{...item,status:'cancelada',cancelledReason:reason.trim()}:item)}
}
export function deductAdministeredMedication(state:PharmacyState,order:MedicationOrder,user:User):PharmacyState {
 if(!hasUserPermission(user,'administer_medication')||!['enfermaria','laboratorio'].includes(user.role)||order.status!=='administrada')throw new Error('Administração não autorizada.')
 if(state.movements.some(item=>item.kind==='administracao'&&item.orderId===order.id))throw new Error('A baixa desta administração já foi registrada.')
 const separation=state.separations.find(item=>item.orderId===order.id&&item.status==='separada')
 if(!separation)throw new Error('Aguarde a farmácia separar o produto e a quantidade em estoque antes de registrar a administração.')
 const lot=state.lots.find(item=>item.id===separation.lotId)
 if(Math.floor(Date.parse(order.administeredAt!)/1000)<Math.floor(Date.parse(separation.at)/1000))throw new Error('A administração não pode ser anterior à separação pela farmácia.')
 if(!lot||lot.expiry<pharmacyDay()||lot.expiry<pharmacyDay(new Date(order.administeredAt!)))throw new Error('O lote separado está vencido. Solicite uma nova separação à farmácia.')
 if(Date.parse(order.administeredAt!)<Math.floor(Date.parse(lot.enteredAt)/1000)*1000)throw new Error('A administração não pode ser anterior à entrada do lote.')
 if(lot.quantity<separation.quantity)throw new Error('Saldo insuficiente para esta administração.')
 const movement:StockMovement={id:id(),kind:'administracao',lotId:lot.id,productId:lot.productId,quantity:separation.quantity,at:order.administeredAt!,recordedAt:new Date().toISOString(),by:user.id,reason:'Administração de medicação prescrita',orderId:order.id,destination:'Paciente'}
 return {...state,events:[...(state.events||[]),{id:id(),at:new Date().toISOString(),by:user.id,action:`Administração com baixa de ${separation.quantity} unidade(s). Solicitação ${order.id}; lote ${lot.lot}`,details:JSON.stringify({orderId:order.id,lotId:lot.id,quantity:separation.quantity,before:lot.quantity,after:lot.quantity-separation.quantity})}],administrations:[...(state.administrations||[]),order],lots:state.lots.map(item=>item.id===lot.id?{...item,quantity:item.quantity-separation.quantity}:item),separations:state.separations.map(item=>item.id===separation.id?{...item,status:'administrada'}:item),movements:[...state.movements,movement]}
}
