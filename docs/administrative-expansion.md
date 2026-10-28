# Administrativo, profissionais, relatórios e unidade

## Dashboard e pacientes

O dashboard mantém os períodos Hoje, 3 dias, 7 dias, 1 mês, 3 meses, 6 meses, 1 ano e Personalizado, com datas inclusivas no fuso de Belém. A classificação de risco vem da triagem, incluindo branca para entradas sem triagem e uma categoria separada para entradas não classificadas. Não é inferida uma nova classificação.

Ocorrências representam entradas hospitalares distintas, com deduplicação por paciente/data de entrada. O indicador por município usa o município/UF de residência do cadastro atual, pois os registros antigos não possuem uma fotografia histórica do endereço. Ausências aparecem como “Não informado”; municípios iguais em UFs diferentes não são agrupados.

Administração → Pacientes cadastrados permite pesquisar nome, CPF, CNS e prontuário, filtrar município, consultar o prontuário/ficha da fila e exportar o cadastro. O dashboard mostra o total atual; o relatório “Pacientes cadastrados no período” usa a data de cadastro.

## Profissionais e perfis

Administração → Profissionais de saúde reutiliza o gerenciamento de usuários, com os campos CBO, classificação de ocupação, setor, unidade, CNS profissional e perfil de acesso. Novos cadastros marcados como profissionais de saúde exigem CBO de seis dígitos, ocupação e unidade; o setor deve ser compatível com o perfil. CRM/UF continua obrigatório para médicos. Os códigos são informados pelo hospital, sem preenchimento automático ou alegação de compatibilidade com tabelas oficiais.

Perfis personalizados continuam disponíveis em Perfis e permissões, incluindo todos os tipos de perfil (também enfermaria e farmácia). O mesmo usuário é utilizado no acesso e no cadastro profissional.

Novas consultas e realizações de exames guardam CBO, ocupação, setor, unidade e CNS profissional junto ao registro. Alterações posteriores no diretório não substituem esses dados históricos. Registros antigos sem fotografia profissional usam os dados disponíveis no cadastro; campos ausentes são mantidos em branco para conferência.

## Visualização por outro perfil

Administração → Visualizar outro perfil permite escolher um perfil e, opcionalmente, um usuário de referência, para aplicar as mesmas permissões, navegação e restrições de pacientes. Sem usuário cadastrado, a visualização usa uma identidade de demonstração e não atribui pacientes a ela.

A sessão real do administrador permanece intacta. A seleção de visualização fica em sessionStorage, exclusiva da aba, e pode ser encerrada pelo botão “Voltar ao administrador”. Um aviso permanente identifica a consulta. Telas podem exibir as ações do perfil, mas operações de gravação são bloqueadas no contexto de dados e nas validações de permissão, incluindo chamadas de senhas, cadastros, medicações, exames, documentos, farmácia e configurações. Não é uma troca de conta nem uma delegação de permissões para outro usuário.

## Relatórios

Os relatórios administrativos suportam CSV, JSON e impressão/PDF com seleção de período e intervalo de datas. Foram acrescentados:

- Ocorrências gerais e por município;
- Ocorrências por faixa etária na data da entrada;
- Pacientes cadastrados no período;
- Produção por CBO (atendimentos médicos concluídos e exames realizados);
- Atendimentos por setor (inícios e conclusões registrados, incluindo enfermaria);
- Dispensação de produtos (saídas manuais e administrações com baixa de estoque; reservas, entradas e descarte não entram);
- Conferência BPA, com códigos e pendências cadastrais.

A idade é calculada para a data da entrada, e não pela idade atual. Procedimentos planejados e exames apenas solicitados não são contados como produção concluída.

### BPA

Administração → Produção / BPA permite codificar fontes reais de produção já concluídas, informando procedimento SIGTAP, descrição, quantidade, modalidade BPA-I/BPA-C, CBO, CNES, CNS profissional, município IBGE e CID. O registro de codificação não altera o atendimento clínico e não gera produção fictícia. A gravação exige as permissões de relatórios e configurações gerais; mudanças na codificação ficam na auditoria.

O relatório é de **conferência**, exportável em CSV/JSON/PDF. Não gera nem transmite o arquivo posicional oficial do BPA/SIA e não afirma que um procedimento é faturável. A validação por competência, instrumento, CBO, estabelecimento e demais regras requer as tabelas oficiais e a modalidade adotada pelo hospital. Pendências cadastrais são exibidas; mesmo sem pendências básicas, a compatibilidade permanece sujeita ao SIA/SIGTAP.

Fontes primárias consultadas em 20/10/2026:

- [Manual operacional do BPA](https://wiki.saude.gov.br/sia/index.php/BPA): modalidades consolidada e individualizada, identificação e vinculação com CNES/CBO.
- [Distribuição oficial do BPA e layout](https://sia.datasus.gov.br/versao/listar_ftp_bpa.php): o arquivo de intercâmbio possui layout próprio, distinto dos relatórios CSV do sistema.

## Modelos e identificação da unidade

Administração → Modelos de fichas oferece modelo de prontuário e ficha da fila de atendimento em uma folha A4. A ficha da fila também pode ser preenchida com os dados disponíveis do paciente e da senha, respeitando as permissões de triagem. Os documentos clínicos existentes permanecem acessíveis pelo prontuário.

Administração → Dados da unidade configura nome, razão social, CNES, CNPJ, contato, endereço, município/UF, imagem e logo. PNG/JPEG de até 5 MB são processados e limitados antes de persistir. A identidade da unidade aparece na navegação, no dashboard quando há imagem e nos modelos/documentos impressos, mantendo a marca MedRisk. Alterações no nome da unidade não reescrevem o histórico dos pacientes.

Toda a persistência permanece local neste protótipo (`medrisk-unit-settings`, `medrisk-production-coding` e o cadastro de acesso existente). Integração com backend, consulta oficial de tabelas e transmissão ao SIA continuam pendentes.
