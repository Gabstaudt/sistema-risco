# Recepção: quadro, destinos e fichas

A tela inicial da recepção e a rota `/recepcao/atendimentos` utilizam o mesmo quadro em três colunas:

- **Triagem**: entradas pelo fluxo com triagem, com a situação atual indicada em cada cartão.
- **Sem triagem**: senhas ainda na recepção, aguardando chamada, identificação e escolha de destino; também permite recuperar uma senha com não comparecimento.
- **Classificação branca**: pacientes já encaminhados diretamente a outro setor, sem passar pela triagem.

Essa separação evita repetir os mesmos pacientes em “Sem triagem” e “Classificação branca”, pois o fluxo direto já recebe a classificação branca. O quadro é uma visualização operacional; não é possível arrastar cartões para alterar classificações ou encaminhamentos. As ações usam as mesmas validações de chamada e confirmação do sistema. A tela de chamada de senhas existente foi preservada.

## Novo atendimento

1. Abrir **Iniciar novo atendimento** e pesquisar pelo nome (também aceita nome social, CPF, CNS e prontuário). A pesquisa textual ignora diferenças de acentuação.
2. Chamar a próxima senha, se ainda não houver uma senha chamada pelo operador. A pesquisa pode ocorrer antes da chamada; o cadastro/encaminhamento exige a senha chamada. A chamada continua seguindo as prioridades e a ordem já existentes.
3. Se o paciente existir e seu atendimento anterior estiver encerrado, selecioná-lo e informar apenas queixa, observações e destino. O prontuário permanece o mesmo. Se houver atendimento em andamento, abrir esse atendimento, sem duplicá-lo.
4. Se não for encontrado, abrir o cadastro. O nome pesquisado é aproveitado no formulário, e o novo cadastro recebe um prontuário único com numeração por ano de Belém. A sequência considera os números existentes, inclusive bases com lacunas.
5. Selecionar o setor e confirmar o encaminhamento. A triagem é o destino inicial; os setores assistenciais ativos cadastrados no administrador também aparecem.
6. A tela do atendimento apresenta prontuário, senha, setor e impressão das fichas.

## Setores e senha

O destino considera o setor cadastrado, e não apenas seu nome. Setores dos fluxos triagem, clínica, cardiologia, anestesia, cirurgia, laboratório e enfermaria podem receber a entrada. Administração, recepção e farmácia não são tratados como setores de avaliação inicial.

Nos destinos médicos, é obrigatório selecionar um médico ativo vinculado ao setor, com a permissão correspondente. A atribuição é aplicada ao paciente para que apenas o médico designado tenha acesso. A recepção não cria uma solicitação clínica de risco cirúrgico ao encaminhar diretamente para uma especialidade.

O laboratório recebe o paciente sem inventar pedidos de exames. A enfermaria recebe uma pendência de entrada: o encaminhamento não cria uma internação ou registro de admissão. A equipe da enfermaria confirma a entrada no próprio módulo e no setor correto.

A senha conserva ID, número, categoria e horário de emissão. Ao ir para a triagem, entra na fila da enfermagem com esse mesmo número. O encaminhamento direto conserva a senha na fila do setor ou da clínica, vinculada ao profissional escolhido. Reroteamentos continuam restritos à fase anterior ao início do cuidado.

## Impressões

No cartão do quadro, o menu **Imprimir ficha** contém:

- Ficha normal;
- Ficha de urgência;
- Ficha ambulatorial.

Na tela do atendimento, as três opções ficam visíveis como botões. As fichas identificam paciente, prontuário, senha, entrada, setor e profissional de destino. Incluem a marca MedRisk e a identificação configurada da unidade, com layout de impressão A4.

Os formatos utilizam as permissões existentes de impressão. Escolher “ficha de urgência” não classifica o paciente como emergência. A recepção não obtém acesso aos sinais vitais ou avaliações clínicas: os espaços clínicos ficam em branco quando não houver permissão. Textos extensos não são truncados para esconder informações.

Os dados continuam no armazenamento local do protótipo. As validações de setor, atribuição, senha e numeração devem ser mantidas no backend ao integrar o fluxo.
