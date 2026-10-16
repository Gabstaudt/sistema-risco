const DB='medrisk-exam-files'
function open():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('files');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(new Error('Não foi possível abrir o armazenamento de arquivos.'));request.onblocked=()=>reject(new Error('Feche as abas antigas para atualizar o armazenamento de arquivos.'))})}
export async function storeExamFile(file:File):Promise<string>{
 if(file.size===0||file.size>10*1024*1024)throw new Error('Use um arquivo de até 10 MB.')
 const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer())
 const pdf=file.type==='application/pdf'&&String.fromCharCode(...bytes.slice(0,5))==='%PDF-'
 const jpg=file.type==='image/jpeg'&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255
 const png=file.type==='image/png'&&[137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte)
 if(!pdf&&!jpg&&!png)throw new Error('Selecione um PDF, JPG ou PNG válido.')
 const db=await open();const id=crypto.randomUUID()
 await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('files','readwrite');transaction.objectStore('files').put(file,id);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(new Error('Não foi possível salvar o arquivo.'));transaction.onabort=()=>reject(new Error('Armazenamento de arquivos indisponível.'))}).finally(()=>db.close())
 return id
}
export async function readExamFile(id:string):Promise<Blob>{const db=await open();return new Promise<Blob>((resolve,reject)=>{const request=db.transaction('files').objectStore('files').get(id);request.onsuccess=()=>request.result?resolve(request.result):reject(new Error('Arquivo indisponível neste navegador.'));request.onerror=()=>reject(new Error('Não foi possível abrir o arquivo.'))}).finally(()=>db.close())}
