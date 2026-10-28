# Exames e medicações

O laboratório abre uma fila operacional em `/laboratorio` ou `/laboratorio/fila`. As telas ocupam a área disponível e não incluem os antigos textos explicativos ou classificações automáticas por palavras em resultados. As ações por paciente ficam em `/laboratorio/registrar/[id]`, aceitando identificador do exame ou do paciente.

Exames têm registros separados de coleta (`coletadoEm`), realização (`performedAt`), análise e liberação (`concluidoEm`), com os respectivos responsáveis. O operador informa o horário, podendo preencher com o horário atual. Datas futuras ou fora da sequência são rejeitadas. Ao concluir todos os exames da entrada, o paciente segue para os pareceres solicitados ou retorna à fila clínica com exames concluídos.

Coleta não exige resultado: um exame pode permanecer em `coletado` e receber resultado posteriormente. `/laboratorio/concluidos` lista os exames finalizados. `/laboratorio/pacientes` permite pesquisar e abrir o paciente, os exames e a ficha de medicação.

O catálogo define categoria e `resultMode`: `single_file` para um arquivo por solicitação; `individual` para resultados registrados separadamente, um por solicitação; `multiple_images` para exames de imagem com um ou mais JPG/PNG. A solicitação guarda a política/categoria vigente, e cada tipo solicitado gera seu próprio registro. Tipos antigos usam a categoria como fallback. Arquivos únicos aceitam PDF/JPG/PNG; cada arquivo tem limite de 10 MB. O formulário oculta novo upload quando o arquivo único já foi anexado; exames de imagem permitem acrescentar imagens sem substituir as existentes. Arquivos são validados por tipo e assinatura, armazenados como Blob em IndexedDB e identificados por metadados na requisição. O download permanece disponível após recarregar no mesmo navegador. Armazenamento no servidor e acesso aos anexos entre equipamentos dependem da integração do backend.

Os resultados clínicos são ordenados pela última movimentação real (solicitação, coleta, realização, análise, liberação ou anexo), do mais recente ao mais antigo. O filtro "Ainda aguardando" reúne solicitações, coletas e análises pendentes; cancelamentos e conclusões são excluídos desse filtro.

Perfis com `prescribe_medication` solicitam medicações indicando medicação, dose, via e orientações. O laboratório registra a administração com data, horário e responsável. Administração sem horário, anterior à solicitação, futura ou duplicada é rejeitada. As solicitações ficam em `hospital-medication-orders` e são sincronizadas entre abas, com Web Locks para evitar dupla administração.

As permissões `prescribe_medication` e `administer_medication` são distintas. Resultado e movimentação de exame exigem as permissões do laboratório. Os novos registros também geram eventos de auditoria. O backend deverá aplicar as mesmas autorizações, transações e validações e vincular os registros à entrada hospitalar correspondente.

Solicitações de medicação podem ser impressas individualmente; a ficha completa inclui prescritor, horários e responsável pela administração. Clínico e cirurgião compartilham o cadastro de tipos de exame, com formato configurável. Cardiologia e anestesia têm listas de exames com abertura individual. O backend deverá persistir os anexos e aplicar atomicamente a política de uploads e a unicidade da administração.
