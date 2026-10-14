# Cardiologia e acompanhamento cirúrgico

A cardiologia registra RCRI, VSG-CRI, EMAPO e ACP/Detsky em `cardiologyAssessment.riskScores`. Resultado e interpretação são informados pelo profissional; esta alteração não implementa fórmulas automáticas. Valores históricos de RCRI/VSG-CRI permanecem disponíveis como referência quando não existe um valor registrado pela cardiologia. ASA permanece em `anesthesiaAssessment.asaClassification`.

Conforme a orientação fornecida para o hospital, um ACP informado como alto risco exige o registro de encaminhamento especializado/suporte ao concluir o parecer. O sistema não decide automaticamente a recomendação cirúrgica a partir dos scores.

O cirurgião registra procedimentos em `surgeryRecords`, separados do parecer de liberação pré-operatória. Cada procedimento tem identificador, tipo, segmento, situação, data de realização, observações e evolução/desfecho pós-operatórios. Editar o seguimento mantém o identificador e o autor original e registra o responsável pela atualização. A ação gera um evento de auditoria.

A auditoria `/admin/cirurgias` conta apenas registros com situação `realizada` e data de realização. Planejamentos, cancelamentos e pareceres de liberação são excluídos. Filtros de período são inclusivos. Tipos são agrupados ignorando diferença de maiúsculas/minúsculas e espaços nas extremidades.

`record_surgery` autoriza os registros pelo perfil cirurgião; `view_surgery_audit` autoriza o painel administrativo. A projeção de dados exclui os registros cirúrgicos de sessões sem leitura clínica. O backend deverá aplicar essas mesmas validações e permissões.
