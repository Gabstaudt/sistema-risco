import type { Patient } from './types'
export const REGISTRATION_TEXT_FIELDS=['nomeCompleto','nomeSocial','cpf','cartaoSus','dataNascimento','sexo','genero','racaCor','cep','logradouro','endereco','numero','complemento','bairro','ufResidencia','municipioResidencia','ufNascimento','municipioNascimento','telefone','telefone2','whatsapp','email','escolaridade','nomeMae','nomePai','responsavel','telefoneResponsavel','contatoEmergencia','informacoesComplementares','nacionalidade','paisNascimento','dataNaturalizacao','portariaNaturalizacao','dataEntradaBrasil','pisPasep','ocupacao','nomePlanoPrivado','photoId','unidade','queixaPrincipal','descricaoInicial'] as const
export const REGISTRATION_BOOLEAN_FIELDS=['situacaoRua','maeDesconhecida','paiDesconhecido','possuiPlanoPrivado'] as const
export type RegistrationDraft=Record<typeof REGISTRATION_TEXT_FIELDS[number],string>&Record<typeof REGISTRATION_BOOLEAN_FIELDS[number],boolean>
export const BRAZIL_STATES=['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
export function registrationDraft(patient?:Patient):RegistrationDraft{
 return {...Object.fromEntries(REGISTRATION_TEXT_FIELDS.map(field=>[field,String(patient?.[field as keyof Patient]||'')])),...Object.fromEntries(REGISTRATION_BOOLEAN_FIELDS.map(field=>[field,Boolean(patient?.[field as keyof Patient])])),nacionalidade:patient?.nacionalidade||'brasileira',paisNascimento:patient?.paisNascimento||'Brasil',unidade:patient?.unidade||'Hospital Central'} as RegistrationDraft
}
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value
export function cleanRegistration(draft:RegistrationDraft,patients:Patient[],id?:string,today=new Date()):Partial<Patient>&Pick<Patient,'nomeCompleto'|'dataNascimento'|'sexo'|'cpf'|'telefone'|'endereco'|'idade'> {
 if(Object.keys(draft).some(field=>![...REGISTRATION_TEXT_FIELDS,...REGISTRATION_BOOLEAN_FIELDS].includes(field as never)))throw new Error('A edição permite apenas dados de cadastro e da entrada atual.')
 const clean=Object.fromEntries(REGISTRATION_TEXT_FIELDS.map(field=>[field,draft[field].trim()])) as Record<typeof REGISTRATION_TEXT_FIELDS[number],string>
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Belem',year:'numeric',month:'2-digit',day:'2-digit'}).format(today)
 if(!clean.nomeCompleto||!validDate(clean.dataNascimento)||clean.dataNascimento>day||!['M','F','O'].includes(clean.sexo))throw new Error('Preencha nome completo, nascimento válido e sexo.')
 if(!draft.maeDesconhecida&&!clean.nomeMae)throw new Error('Informe o nome da mãe ou marque mãe desconhecida.')
 if(!draft.paiDesconhecido&&!clean.nomePai)throw new Error('Informe o nome do pai ou marque pai desconhecido.')
 const cpf=clean.cpf.replace(/\D/g,'');const cns=clean.cartaoSus.replace(/\D/g,'')
 if(cpf&&cpf.length!==11)throw new Error('Informe um CPF com 11 dígitos.')
 if(cns&&cns.length!==15)throw new Error('Informe um CNS com 15 dígitos.')
 if(cpf&&patients.some(patient=>patient.id!==id&&patient.cpf.replace(/\D/g,'')===cpf))throw new Error('Já existe outro paciente com este CPF.')
 if(cns&&patients.some(patient=>patient.id!==id&&patient.cartaoSus?.replace(/\D/g,'')===cns))throw new Error('Já existe outro paciente com este CNS.')
 for(const field of ['telefone','telefone2','whatsapp','telefoneResponsavel','contatoEmergencia'] as const){const digits=clean[field].replace(/\D/g,'');if(clean[field]&&(digits.length<7||digits.length>15))throw new Error('Informe um telefone válido, incluindo DDD/código do país.');clean[field]=digits}
 if(clean.email&&!/^\S+@\S+\.\S+$/.test(clean.email))throw new Error('Informe um e-mail válido.')
 if(clean.cep&&clean.cep.replace(/\D/g,'').length!==8)throw new Error('Informe um CEP com 8 dígitos.')
 for(const field of ['ufResidencia','ufNascimento'] as const)if(clean[field]&&!BRAZIL_STATES.includes(clean[field]))throw new Error('Selecione uma UF válida.')
 if(!['brasileira','naturalizado','estrangeiro'].includes(clean.nacionalidade))throw new Error('Selecione a nacionalidade.')
 if(clean.nacionalidade==='naturalizado'&&!clean.dataNaturalizacao)throw new Error('Informe a data de naturalização.')
 if(clean.nacionalidade!=='brasileira'&&!clean.paisNascimento)throw new Error('Informe o país de nascimento.')
 for(const field of ['dataNaturalizacao','dataEntradaBrasil'] as const)if(clean[field]&&(!validDate(clean[field])||clean[field]>day||clean[field]<clean.dataNascimento))throw new Error('Informe datas válidas, posteriores ao nascimento e sem data futura.')
 if(clean.pisPasep&&clean.pisPasep.replace(/\D/g,'').length!==11)throw new Error('Informe PIS/PASEP com 11 dígitos.')
 const [year,month,date]=clean.dataNascimento.split('-').map(Number);const [nowYear,nowMonth,nowDate]=day.split('-').map(Number);const age=nowYear-year-(nowMonth<month||(nowMonth===month&&nowDate<date)?1:0)
 return {...clean,...Object.fromEntries(REGISTRATION_BOOLEAN_FIELDS.map(field=>[field,Boolean(draft[field])])),nomeCompleto:clean.nomeCompleto,dataNascimento:clean.dataNascimento,sexo:clean.sexo as Patient['sexo'],cpf:cpf?cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4'):'',cartaoSus:cns,idade:age,telefone:clean.telefone,endereco:clean.endereco,nomeMae:draft.maeDesconhecida?'':clean.nomeMae,nomePai:draft.paiDesconhecido?'':clean.nomePai,dataNaturalizacao:clean.nacionalidade==='naturalizado'?clean.dataNaturalizacao:'',portariaNaturalizacao:clean.nacionalidade==='naturalizado'?clean.portariaNaturalizacao:'',nomePlanoPrivado:draft.possuiPlanoPrivado?clean.nomePlanoPrivado:''}
}
