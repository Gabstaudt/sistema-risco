export type ReportTable = { title:string; headers:string[]; rows:(string|number)[][] }
export function csvValue(value:string|number){const text=String(value);return `"${(/^[\s]*[=+\-@]/.test(text)?"'"+text:text).replaceAll('"','""')}"`}
export function reportCsv(tables:ReportTable[]){return '\uFEFF'+tables.map(table=>[[table.title],table.headers,...table.rows].map(row=>row.map(csvValue).join(';')).join('\r\n')).join('\r\n\r\n')}
export function downloadReport(filename:string,content:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export function exportCsv(filename:string,tables:ReportTable[]){downloadReport(filename+'.csv',reportCsv(tables),'text/csv;charset=utf-8;')}
