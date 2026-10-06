# Permissões de visualização

`lib/permissions.ts` centraliza as permissões usadas pelo contexto de dados, ficha do paciente, menu, atalhos e proteção de rotas. Os dados completos do mock permanecem internos ao `DataProvider`; os leitores públicos recebem uma projeção por lista explícita de campos.

A recepção recebe apenas cadastro, contato e dados da entrada atual. Triagem, avaliações, resultados, scores, pareceres e histórico não são renderizados nem retornados pelos leitores públicos para esse perfil. Status finais que revelam classificação médica são apresentados como atendimento concluído.

## Contrato para o backend

O usuário da sessão aceita `permissions?: string[]`. Quando a API fornecer essa lista, ela será a fonte de permissões efetivas: **substitui** os padrões locais, e `[]` nega todo acesso. A ausência da propriedade usa os padrões do mock. Não omitir a lista ao integrar a API.

O adaptador de autenticação pode chamar `useAuth().setSession(user)` com o usuário autenticado e a lista recebida, inclusive após alterações de permissão. As permissões de leitura do paciente são:

- `view_patient_basic`: cadastro e entrada atual.
- `view_triage_data`: sinais e informações da triagem.
- `view_clinical_data`: avaliações, pareceres e scores.
- `view_exam_results`: solicitações e resultados de exames.
- `view_patient_history`: histórico e auditoria do paciente.
- `view_all_data`: concede as leituras acima; não concede gestão administrativa ou escrita.

Rotas de perfil também exigem `view_dashboard_<perfil>`. Cadastro exige `create_patient`; lista exige `view_patients_list` e `view_patient_basic`; encaminhamento exige `forward_to_triage`. Entradas históricas com snapshots clínicos exigem todas as permissões de leitura envolvidas.

## Limite do mock e integração

Estas restrições controlam a interface atual. O mock ainda usa dados completos e autenticação em `localStorage`, que podem ser inspecionados ou alterados no navegador. A integração deve substituir esse armazenamento por sessão autenticada no servidor. A API deve validar as permissões em cada leitura/escrita e retornar somente os campos autorizados, sem enviar dados clínicos para clientes da recepção. O filtro do frontend não substitui autorização no backend.

Os testes em `lib/permissions.test.ts` cobrem recepção, acesso direto, listas vazias do backend, remoção de campos sensíveis, concessões granulares e preservação dos demais perfis.

## Edição do cadastro

A ficha básica permite editar nome, nascimento, sexo, CPF, SUS, contatos, endereço, responsável, unidade e o relato da entrada atual. O método `updatePatientBasic` exige `view_patient_basic` e `edit_patient_basic`, rejeita campos fora da lista permitida, valida dados obrigatórios e CPF duplicado, recalcula a idade e registra a alteração na auditoria. Prontuário, data de entrada, status e dados clínicos não fazem parte do payload de edição. O futuro endpoint deve aplicar as mesmas permissões e validar a lista de campos no servidor.
