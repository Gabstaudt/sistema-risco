# Farmácia e estoque

## Acesso e cadastros

O administrador acessa **Administração → Farmácia e estoque**. O perfil **Farmácia** e o setor correspondente estão disponíveis para cadastro de usuários em Administração → Usuários. O módulo exige `manage_pharmacy`; o perfil de farmácia não recebe acesso às avaliações, resultados ou histórico clínico. Perfis personalizados e permissões explícitas permanecem preservados. A migração acrescenta o módulo ao perfil administrativo padrão uma única vez.

Cadastros editáveis: fornecedores (CNPJ normalizado e pesquisa local por nome/CNPJ), produtos (código único, apresentação, unidade, estoque mínimo, antecedência de vencimento e situação) e programas de saúde. A busca por CNPJ consulta os fornecedores cadastrados neste sistema, sem consulta externa à Receita.

O estoque é separado por produto, lote, localização, validade, fornecedor e programa. Entradas registram data, responsável, quantidade e motivo/documento. As quantidades são inteiras na unidade de estoque definida pelo hospital. Não há conversão automática entre dose prescrita e unidade de estoque. Estoques físicos, reservados e disponíveis aparecem separadamente. Alertas identificam estoque baixo, proximidade do vencimento e lotes vencidos. Lotes com vencimento na data atual permanecem válidos até o fim do dia de Belém.

## Separação e baixa

1. O médico solicita a medicação pelo fluxo existente.
2. A farmácia abre **Separação**, seleciona o produto/lote, informa a quantidade em unidades de estoque e confirma a conferência da apresentação, dose e quantidade com a prescrição. Os lotes oferecidos são ordenados pela validade; lotes vencidos e produtos inativos não podem ser separados.
3. A separação reserva o saldo, sem diminuir a quantidade física. É possível cancelar a separação com justificativa e realizar outra.
4. A enfermagem visualiza o produto, lote e quantidade separados e registra a data/hora real da administração. O registro exige uma separação válida, além das restrições de acesso e do atendimento já existentes. O laboratório continua podendo registrar a administração quando possuir essa permissão.
5. A administração gera uma única saída de estoque vinculada à solicitação e encerra a reserva. Tentativas repetidas são rejeitadas. Cancelar o atendimento libera as reservas de solicitações canceladas; nunca devolve automaticamente uma medicação já administrada.

Saídas manuais exigem justificativa e destinação. Saldos reservados não podem ser consumidos por saídas ou descartes; cancele a separação antes. A aba **Medicamentos vencidos** permite informar quantidade, justificativa e destino, inicialmente “Lixo hospitalar”, e confirmar a baixa. O registro informa a destinação escolhida pelo usuário.

## CSV e histórico

Em Movimentações é possível filtrar por tipo e período, baixar o modelo, importar CSV e exportar movimentações, entradas ou saídas. As saídas incluem saídas manuais, administrações e descartes. Estoque e histórico também têm exportação própria. O histórico registra autor, data e alterações dos cadastros, estoque e separações.

O CSV de movimentações usa as colunas:

`id;tipo;codigo_produto;lote;localizacao;validade;quantidade;fornecedor_cnpj;programa;motivo;destinacao;data`

- `id`: identificador único obrigatório; identificadores já registrados são ignorados e contabilizados para evitar importação repetida.
- `tipo`: `entrada`, `saida` ou `descarte`. Administrações exportadas não podem ser importadas como registros de administração: são realizadas no fluxo autorizado de enfermagem/laboratório.
- O produto, fornecedor e programa devem existir; fornecedor e programa são opcionais. Entradas precisam de produto ativo, lote, localização, validade (`AAAA-MM-DD`), quantidade inteira e motivo. Saídas/descartes precisam identificar o lote e informar destinação.
- `data` opcional: data/hora ISO; sem preenchimento é utilizado o momento da importação. Não aceita data futura; saídas não podem anteceder a entrada do lote.
- Arquivos UTF-8, com ou sem BOM, até 2 MB e 5.000 linhas; aceita separador ponto e vírgula ou vírgula e campos entre aspas com quebras de linha. A exportação protege células interpretáveis como fórmulas.
- O arquivo inteiro é validado antes da gravação. Uma linha inválida impede toda a importação; o erro informa a linha.

## Persistência e concorrência

Este é o armazenamento local do protótipo. O estado fica em `medrisk-pharmacy`. Operações de estoque/separação usam Web Locks, sempre na ordem medicações → farmácia, quando disponíveis. Não há coordenação entre computadores ou navegadores distintos.

O saldo, a movimentação e o registro definitivo da medicação administrada são gravados juntos em uma única atualização do estado da farmácia. `hospital-medication-orders` recebe uma projeção para compatibilidade; a leitura reconcilia o registro definitivo para impedir nova administração se uma gravação dessa projeção falhar. O backend deverá reproduzir essa transação e suas validações no banco de dados.
