# Administração

## Acessos e diretório profissional

- `/admin/configuracoes`: todos os oito perfis iniciais e perfis personalizados, criados a partir de um tipo operacional. Os médicos mantêm a hierarquia Médico → especialidade. Permissões são explícitas, pesquisáveis e editáveis; perfis podem ser ativados/inativados.
- `/admin/usuarios`: criar/editar usuário, perfil de acesso, e-mail, senha inicial/nova senha, setor e situação. Médicos informam CRM/UF e sala. Senha vazia na edição preserva a anterior. E-mails duplicados são rejeitados. Senhas não aparecem no diretório nem nos relatórios.
- Perfis em uso não podem trocar de tipo operacional. É possível criar outro perfil e mudar o vínculo do usuário. Não é possível inativar ou remover as permissões essenciais do último administrador ativo.
- Usuários inativos ou vinculados a perfil inativo não entram no sistema. Alterações no perfil são refletidas em suas sessões gerenciadas, inclusive entre abas. Diretórios da triagem, encaminhamentos médicos, prontuário, auditoria e impressões usam os usuários gerenciados, em vez de uma lista estática.
- Novos perfis começam com permissões granulares. O direito legado `view_all_data`, quando selecionado, inclui os direitos de leitura; a tela mostra esses direitos como herdados. O direcionamento por médico continua obrigatório mesmo com esse direito.
- `/admin/exames`: lista de solicitações, filtros de situação/paciente, abertura individual e exportação; aba de catálogo para criar/editar/inativar tipos de exames. Solicitações existentes preservam seus metadados. Tipos inativos deixam de ser oferecidos para novas solicitações.

A persistência de usuários/perfis é `medrisk-access-registry`, com Web Locks para mutações. `useAuth` resolve o perfil efetivo. Sessões externas do backend com permissões explícitas continuam usando os direitos enviados pelo backend. As alterações administrativas geram eventos na auditoria.

## Indicadores e períodos

`/admin` apresenta a visão administrativa; `/admin/relatorios` apresenta os dados completos e permite impressão. Presets: hoje, 3 dias, 7 dias, 1/3/6 meses e 1 ano, além de datas personalizadas. Dias usam America/Belem; o início e o fim são inclusivos. Meses/ano usam calendário, ajustando o dia quando o mês não o contém. Datas inválidas/invertidas bloqueiam resultados e exportação.

- **Entradas / classificação:** entradas hospitalares no período por Manchester. O mesmo atendimento presente em mais de um snapshot não duplica a contagem. Entradas sem classificação têm grupo próprio; não são classificadas automaticamente.
- **Pacientes atendidos:** pacientes distintos com avaliação médica concluída no período. As entradas atendidas e as avaliações por especialidade também estão no relatório de resumo.
- **Produtividade médica:** uma avaliação concluída por especialidade/entrada, atribuída pelo identificador do profissional; rascunhos são excluídos. Eventos de auditoria complementam avaliações ausentes dos snapshots sem duplicá-las.
- **Exames mais realizados:** exames com data real de realização ou análise no período. Solicitações e exames apenas coletados não contam como realizados. O relatório de movimentações inclui solicitações, coletas e resultados do período separadamente.
- **Medicações mais utilizadas:** administrações com horário registrado, incluindo histórico e solicitações atuais. Prescrições pendentes não são contadas; cópias do mesmo registro no histórico são deduplicadas.
- **Espera por setor:** entrada na fila até início de atendimento; o período filtra a data de início. Recepção registra emissão → chamada efetivamente vinculada a um cadastro; triagem registra encaminhamento → início; clínico registra entrada em sua fila → início. Especialistas registram solicitação/encaminhamento → abertura de avaliação elegível. Laboratório registra solicitação → primeira coleta/realização; uma amostra por exame. Cada setor mostra número de amostras. Ausência de horários resulta em “Sem registros”, sem substituir por zero ou duração total de atendimento.

`careTimings` preserva a identificação da entrada e os horários, inclusive ao abrir outra entrada do paciente. Continuar/reabrir a mesma etapa não cria outra amostra. Casos antigos sem horário de início não recebem datas estimadas retroativamente.

## Exportações

Relatório completo ou individual em CSV, JSON e impressão/PDF, mantendo o período selecionado. Inclui classificações, produtividade, exames, medicações, pacientes/entradas, esperas, detalhamento de avaliações, movimentações de exames, administrações, cirurgias e auditoria. Cadastros atuais de usuários, perfis e tipos de exames também são exportáveis e identificados como cadastros atuais, sem filtro artificial por atendimento. Usuários e perfis têm exportação na própria tela. CSV escapa células e neutraliza fórmulas; nenhuma exportação inclui senhas.

## Integração do backend

O gerenciamento e os relatórios funcionam com os dados locais do protótipo. Em produção, usuários, perfis, credenciais, eventos e indicadores precisam de persistência compartilhada no servidor. O backend deve autenticar, aplicar permissões/escopo, proteger senhas, registrar eventos e garantir as invariantes administrativas de forma atômica. Os cálculos estão isolados em `lib/admin-analytics.ts`; as regras de gestão, em `lib/admin-access.ts`.
