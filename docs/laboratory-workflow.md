# Exames e medicações

O laboratório abre uma fila operacional em `/laboratorio` ou `/laboratorio/fila`. As telas ocupam a área disponível e não incluem os antigos textos explicativos ou classificações automáticas por palavras em resultados. As ações por paciente ficam em `/laboratorio/registrar/[id]`, aceitando identificador do exame ou do paciente.

Exames têm registros separados de coleta (`coletadoEm`), realização (`performedAt`), análise e liberação (`concluidoEm`), com os respectivos responsáveis. O operador informa o horário, podendo preencher com o horário atual. Datas futuras ou fora da sequência são rejeitadas. Ao concluir todos os exames da entrada, o paciente segue para os pareceres solicitados ou retorna à fila clínica com exames concluídos.

O resultado pode ser textual ou um arquivo PDF/JPG/PNG, até 10 MB. Arquivos são validados por tipo e assinatura, armazenados como Blob em IndexedDB e identificados por metadados na requisição. O download permanece disponível após recarregar no mesmo navegador. Armazenamento no servidor e acesso aos anexos entre equipamentos dependem da integração do backend.

Os resultados clínicos são ordenados pela última movimentação real (solicitação, coleta, realização, análise, liberação ou anexo), do mais recente ao mais antigo. O filtro "Ainda aguardando" reúne solicitações, coletas e análises pendentes; cancelamentos e conclusões são excluídos desse filtro.

Clínico e cirurgião solicitam medicações indicando medicação, dose, via e orientações. O laboratório registra a administração com data, horário e responsável. Administração sem horário, anterior à solicitação, futura ou duplicada é rejeitada. As solicitações ficam em `hospital-medication-orders` e são sincronizadas entre abas, com Web Locks para evitar dupla administração.

As permissões `prescribe_medication` e `administer_medication` são distintas. Resultado e movimentação de exame exigem as permissões do laboratório. Os novos registros também geram eventos de auditoria. O backend deverá aplicar as mesmas autorizações, transações e validações e vincular os registros à entrada hospitalar correspondente.
