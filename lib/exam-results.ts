import type { ExamRequest, ExamType } from './types'
export function examFiles(exam: ExamRequest) {
 const files = [...(exam.attachments || []), ...(exam.attachment ? [exam.attachment] : [])]
 return [...new Map(files.map(file => [file.id, file])).values()]
}
export function examResultMode(exam: Pick<ExamRequest, 'resultMode' | 'examCategory'>, type?: ExamType) {
 return exam.resultMode || type?.resultMode || ((exam.examCategory || type?.category || '').toLocaleLowerCase().includes('imagem') ? 'multiple_images' : 'single_file')
}
export function validateExamFiles(exam: ExamRequest, type?: ExamType) {
 const files = examFiles(exam)
 const mode = examResultMode(exam, type)
 if (mode !== 'multiple_images' && files.length > 1) throw new Error('Este exame permite apenas um arquivo de resultado.')
 if (mode === 'multiple_images' && files.some(file => !['image/jpeg', 'image/png'].includes(file.type))) throw new Error('Exames de imagem aceitam imagens JPG ou PNG.')
 if (new Set(files.map(file => file.id)).size !== files.length) throw new Error('Arquivo duplicado.')
 return files
}
