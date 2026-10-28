# Configurações do laboratório

Acesso: Administração → Exames → Configurações do laboratório.

A administração configura a disponibilidade dos tipos de exames, inclusive da categoria Hematologia. Exames inativos deixam de estar disponíveis em novas solicitações; as solicitações existentes e seus resultados são preservados. Configurar disponibilidade e faixas etárias exige as permissões `system_settings` e `create_exam_type`, verificadas também na operação de gravação. Médicos com permissão continuam podendo cadastrar tipos de exames.

Cada exame pode ter faixas etárias nomeadas em anos completos, com idade mínima inclusiva, idade máxima inclusiva opcional e referência cadastrada pelo hospital. Faixas de um mesmo exame não podem se sobrepor. Sem faixa correspondente ou referência específica, usa-se a referência geral. Não são gerados valores clínicos automaticamente. A referência é copiada para a solicitação conforme a idade na data do pedido, para preservar o registro após alterações do catálogo.

A fila do laboratório prioriza a urgência registrada no exame ou a classificação de triagem do paciente, seguida pelo horário da solicitação em ordem crescente. Sem classificação, o exame entra após os classificados. A opção “Ordem de chegada” ordena exclusivamente pelo horário da solicitação. Coleta e publicação não alteram a posição de chegada. A lista de concluídos conserva a ordenação pelo evento mais recente.

As configurações são persistidas no armazenamento local do protótipo, junto ao catálogo de exames. A integração com backend segue pendente.
