# Perfis médicos, escopo e documentos

A hierarquia é `professionalGroup: medico` e `medicalSpecialty: clinico | cirurgiao | cardiologista | anestesista`. `normalizeUserProfile` aceita sessões do backend com `role: medico` e especialidade obrigatória, convertendo para as rotas legadas de cada especialidade. Sidebar, cabeçalho e filtros da administração mostram os dois níveis. A lista efetiva `permissions`, inclusive vazia, substitui os padrões locais.

A leitura médica é limitada pelo profissional direcionado no paciente: clínico da triagem, cardiologista/cirurgião indicados na solicitação e anestesista responsável. Uma solicitação especializada explícita prevalece sobre os campos legados. `view_all_data` não elimina esse escopo. Pacientes, exames, medicações, documentos, consultas por ID e impressões usam o mesmo conjunto visível. Novas solicitações especializadas concluídas exigem responsável. A migração preenche atribuições ausentes apenas dos pacientes de demonstração já conhecidos, sem substituir atribuições salvas.

Todos os quatro perfis médicos têm receitas e atestados em `/paciente/[id]/documentos`, acessíveis pelo prontuário e pela avaliação. O médico escreve o conteúdo e informa CRM/UF; atestados também têm início e fim. O registro guarda autor, especialidade, data, conteúdo e registro profissional, sem gerar doses ou diagnósticos. O botão emitir possui proteção contra duplo clique; o armazenamento entre abas usa Web Locks. Documentos emitidos têm leitura e impressão e não são sobrescritos ao emitir outro.

`/paciente/[id]/imprimir` apresenta versões A4 para prontuário, histórico de atendimentos, medicações, solicitação individual de medicação, exames, receita e atestado. Cada tipo exige sua permissão; a página sempre verifica o paciente visível e o vínculo do documento/exame/medicação ao paciente. A impressão contém a marca MedRisk e não inclui navegação. Receitas e atestados têm espaço para assinatura e carimbo. Anexos originais PDF/imagens podem ser abertos e impressos pelo visualizador do navegador; imagens também aparecem na impressão do resultado.

Persistência atual: `hospital-medical-documents` em localStorage; anexos no IndexedDB do mesmo navegador. Para produção, o backend deve resolver a hierarquia e o escopo da sessão autenticada, validar o registro profissional, persistir documentos e emitir eventos de auditoria no servidor. A interface não substitui autorização no servidor nem realiza assinatura digital.

## Consultório, disponibilidade e consulta

Os quatro perfis médicos recebem um aviso por sessão de login para confirmar consultório e setor. A escolha pode ser adiada e alterada em Meu consultório e setor. Os setores vêm do administrador e mantêm o tipo da especialidade; esta alteração não modifica permissões nem o perfil do médico. A disponibilidade é configurada manualmente como disponível, em atendimento ou indisponível. Médicos indisponíveis não são oferecidos em novos encaminhamentos médicos.

Meus atendimentos reúne os pacientes direcionados e os últimos registros do próprio médico. O atendimento compartilhado também está nas avaliações das quatro especialidades. Chamar paciente no painel usa a mesma senha; especialistas aparecem na coluna Consultório. Iniciar consulta exige chamada vinculada ao médico. O temporizador usa o horário persistido, permanece após recarregar e termina na finalização ou encaminhamento. A anamnese tem salvamento explícito e aparece no prontuário e na impressão.

Finalizar consulta requer anamnese, encerra a chamada e preserva o fluxo de solicitações pendentes. Não concede liberação cirúrgica ou anestésica. O cancelamento administrativo encerra também o temporizador. Encaminhar exige setor ativo, outro médico compatível quando aplicável e justificativa. A anamnese e a avaliação anterior ficam preservadas; o prontuário passa a seguir o direcionamento de destino. O histórico do autor conserva seus próprios registros mesmo após perder o acesso ao prontuário transferido.

Meus relatórios usa apenas os registros do médico autenticado, com período, exportação CSV e impressão A4. Os indicadores administrativos também incorporam as novas consultas encerradas. A ficha de urgência exibe os dados da triagem e usa o formato A4 da ficha de triagem.

## Fichas de internação

Autorização, requisição de exames, folha de internação, evolução clínica, notificação de internação e notificação de infecção recebem conteúdo escrito pelo médico, CRM/UF, paciente, autoria e data de emissão. Cada ficha é salva e impressa individualmente. A emissão não cria automaticamente pedidos de exame nem comunica órgãos externos. Receitas e atestados mantêm seu fluxo próprio.

As funcionalidades continuam no armazenamento local do protótipo. O backend deve aplicar escopo por paciente, permissões, operações atômicas, persistência dos horários, diretório de profissionais e documentos. O login por CPF/CRM será tratado na etapa posterior; esta alteração mantém a autenticação atual.
