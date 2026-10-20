# Enfermaria

O módulo tem perfil operacional próprio, setor cadastrado pelo administrador, lista de pacientes em acompanhamento, pesquisa, entrada de pacientes e lista de altas. O administrador pode criar usuários da enfermaria e gerenciar permissões de entrada, sinais vitais, observações, reavaliação, medicação e alta separadamente. A migração adiciona o perfil e o setor sem alterar as permissões de perfis existentes nem criar contas em diretórios já configurados. Uma instalação de demonstração nova inclui um usuário e pacientes fictícios.

## Entrada e encaminhamento

A equipe pode selecionar um paciente com entrada hospitalar em andamento, informar o motivo e o leito/localização. Não é permitido duplicar um acompanhamento ativo. Uma consulta em andamento deve utilizar o encaminhamento do profissional responsável.

Médicos e triagem podem escolher um setor de enfermaria ativo. O encaminhamento abre o acompanhamento preservando a triagem, avaliações médicas, anamnese e médico responsável. A chamada da etapa anterior é encerrada, mantendo a senha hospitalar. Não há aprovação clínica automática.

## Acompanhamento

Cada aferição, observação ou reavaliação é um registro acrescentado ao histórico: horário do fato, horário de gravação e profissional responsável. Os valores ficam separados da aferição inicial da triagem. A tela mostra a última aferição, e os registros anteriores permanecem consultáveis.

Sinais disponíveis: pressão arterial, frequência cardíaca, frequência respiratória, temperatura, SpO₂, HGT, Glasgow e peso. É possível registrar informação complementar e observações. A reavaliação exige descrição e pode incluir novos sinais vitais. Datas anteriores à entrada no setor ou futuras são rejeitadas. Não são calculadas interpretações clínicas automaticamente.

## Medicações

A enfermaria administra ordens já prescritas; não prescreve nem altera dose/via. A administração exige horário após a solicitação e a entrada no setor. Laboratório e enfermaria usam a mesma ordem e a mesma trava de administração: a mesma solicitação só é administrada uma vez, inclusive em abas concorrentes. O horário e o responsável ficam registrados. Ordens canceladas, de outro episódio ou sem acompanhamento ativo não podem ser administradas pela enfermaria.

## Alta e escopo

A alta exige observações/destino e confirmação. Encerra apenas o acompanhamento da enfermaria, preserva o histórico e retoma o fluxo anterior quando não há outra situação médica mais recente. Não concede alta hospitalar ou liberação cirúrgica automaticamente. O encerramento administrativo do atendimento hospitalar também encerra o acompanhamento, identificado como administrativo.

A enfermaria consulta pacientes de seu setor e seus registros anteriores. O cadastro usado na pesquisa de entrada é mínimo. Dados médicos atuais não são expostos após o encerramento do acompanhamento nem para outro setor; medicações, documentos e exames seguem o período do episódio. O perfil não recebe acesso à auditoria de execução do sistema.

Os registros da enfermaria acompanham o prontuário e sua impressão para profissionais autorizados. A implementação usa a persistência local atual do protótipo; o backend deve aplicar as mesmas permissões, escopo por setor e operações atômicas.

O layout usa a identidade MedRisk existente e pode ser ajustado quando as fotos de referência forem fornecidas.
