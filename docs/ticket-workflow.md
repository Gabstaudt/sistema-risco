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
