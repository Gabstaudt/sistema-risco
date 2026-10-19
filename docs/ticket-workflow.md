# Fluxo de senhas

- `/senha`: retirada da senha na chegada, com categorias emergência (E), prioridade (P) e comum (C).
- `/recepcao/fila`: chamada, rechamada, cadastro ou vínculo com um cadastro existente e encaminhamento à triagem.
- `/triagem` e `/triagem/fila`: mesma fila de senhas encaminhadas, chamada pela enfermagem e início do atendimento.
- `/clinico/fila`: chamadas apenas dos pacientes direcionados ao clínico autenticado.
- `/painel`: última chamada em destaque e setores recepção, triagem e consultório, sem nomes, prontuários ou dados clínicos.

Na recepção, a chamada padrão considera emergência, prioridade e comum, com chegada dentro da categoria. Na triagem e no clínico, a próxima chamada segue a chegada original, sem promover senhas por categoria. Em cada setor, o operador pode escolher uma senha específica. A categoria não define a classificação Manchester. O mesmo identificador e número acompanham as etapas. A recepção precisa chamar a senha antes de vinculá-la; a triagem precisa chamar e iniciar o atendimento antes de salvar. Concluir a triagem encaminha a mesma senha para a fila do clínico direcionado. Concluir a avaliação clínica encerra a chamada; um retorno por exames concluídos reutiliza o número. A classificação Manchester permanece disponível na avaliação.

Uma senha chamada pertence ao operador responsável. Rechamar não gera outro número. Trocar uma senha apenas chamada devolve a anterior à fila, sem alterar a chegada; uma senha em atendimento precisa ser concluída antes de outra chamada. Ausência libera o operador e permite retornar a mesma senha à fila. O cadastro direto previamente permitido ao perfil de triagem continua disponível e gera uma senha comum identificada para a fila de enfermagem.

Ao selecionar um paciente já cadastrado, a recepção abre `/recepcao/entrada/[id]` com identificação em leitura e somente queixas obrigatórias e observações opcionais. A entrada e o envio à triagem acontecem após confirmar esse formulário. Uma nova entrada de paciente já cadastrado só é aberta quando o atendimento anterior está encerrado. O prontuário é preservado, a entrada anterior é arquivada com os dados clínicos e a nova triagem começa vazia. Registros históricos de cirurgia permanecem disponíveis. Exames de entradas anteriores não são usados para impedir a solicitação de um novo exame.

Nesta versão, o estado usa `localStorage`, eventos `storage` e Web Locks para sincronização e concorrência entre abas do mesmo navegador. Os mocks inicializam exemplos de senhas e vinculam pacientes já aguardando triagem. A numeração é diária por categoria, mantendo números ativos distintos quando há senhas pendentes de dias anteriores.

O backend deverá substituir a persistência local por uma fila compartilhada, com emissão e transições atômicas, índices únicos, autenticação, permissões `manage_reception_queue` / `call_triage_ticket` / `clinical_evaluation` e atualização de chamadas entre equipamentos. O painel público deve receber apenas número, categoria, setor, sala e horário de chamada.

## Entrada pela recepção

A recepção inicia pela pesquisa de nome, nome social, CPF, CNS ou prontuário. Um cadastro existente recebe apenas a queixa e as observações da nova entrada; um cadastro novo usa o formulário completo, com foto opcional por câmera ou arquivo. Nome, nascimento, sexo e filiação são obrigatórios, permitindo marcar mãe/pai desconhecidos. CPF e contatos são opcionais.

O encaminhamento exige confirmação e mantém a mesma senha: com triagem segue para a enfermagem; sem triagem segue para o clínico selecionado com identificação branca, sem inventar classificação Manchester. As filas clínicas continuam restritas ao profissional responsável. As listas da recepção separam os dois caminhos.

A recepção pode atualizar queixa e observações. A mudança de destino só é permitida antes da chamada/início do próximo setor. Baixa/cancelamento exigem justificativa, encerram a senha e cancelam solicitações pendentes da entrada atual, preservando resultados concluídos e medicações administradas. Uma nova entrada arquiva o atendimento anterior. A ficha em branco está disponível para impressão A4.

Os dados e fotos permanecem no protótipo local (localStorage e IndexedDB); a integração com o backend deve aplicar as mesmas permissões e transações.
