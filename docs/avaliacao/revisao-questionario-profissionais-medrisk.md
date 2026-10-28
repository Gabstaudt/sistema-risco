# Revisão crítica do questionário de avaliação do MedRisk

**Documento avaliado:** “Apêndice B – Instrumento de avaliação dos profissionais”, enviado nesta conversa.  
**Data da revisão:** 28/10/2026.  
**Base da análise:** texto do questionário, funcionalidades encontradas no código atual e escopo discutido para a plataforma e para o futuro módulo independente de risco cirúrgico.

## 1. Parecer

**O questionário é parcialmente coerente com o MedRisk, mas recomendo ajustes antes da aplicação.** A estrutura em usabilidade, funcionalidades e comentários é adequada. O cálculo apresentado para a SUS está correto, assim como a decisão de analisar separadamente as questões específicas.

Os problemas mais importantes são:

1. O item 14 pressupõe uma **sugestão automática de exames**, que não foi identificada na versão atual.
2. Todos os participantes são orientados a avaliar funções que nem todos executam ou visualizam.
3. A Parte I utiliza uma redação adaptada sem identificar qual versão brasileira da SUS foi adotada.
4. Há mistura entre facilidade de uso, utilidade esperada, segurança percebida e resultados assistenciais.
5. A identificação por iniciais, registro e assinatura exige uma explicação mais precisa sobre confidencialidade.
6. A interpretação por faixas da SUS está apresentada sem referência e como se fosse universal.
7. Não está definido se a avaliação abrange o fluxo pré-operatório, toda a plataforma hospitalar ou o módulo independente futuro.

A recomendação é **preservar a SUS como instrumento padronizado e revisar o bloco autoral de funcionalidades**, com perguntas aplicáveis ao perfil e às tarefas realmente testadas.

## 2. Definir o objeto da avaliação

### Alteração prioritária

Para o questionário atual, que reúne principalmente médicos e TI, sugiro definir o objeto como:

> Avaliação da usabilidade e da adequação funcional do fluxo pré-operatório do MedRisk, na versão disponibilizada para o teste.

Essa definição é mais coerente com as perguntas sobre pareceres e liberação para cirurgia do que afirmar que o formulário avalia integralmente todos os módulos hospitalares.

| Objeto escolhido | Consequência para o instrumento |
| --- | --- |
| Fluxo pré-operatório atual — recomendado para este formulário | Médicos avaliam suas tarefas; TI pode avaliar navegação e execução de cenários, sem substituir o julgamento clínico. |
| Plataforma hospitalar completa | Acrescentar participantes e tarefas de recepção, triagem, laboratório, enfermaria, farmácia e administração, conforme o protocolo da pesquisa. Não basta acrescentar perguntas a médicos. |
| Módulo independente integrado a outros sistemas | Reservar para etapa futura, quando houver módulo e integração utilizáveis. Diagramas e propostas arquiteturais não demonstram essa funcionalidade. |

**Não incluir agora perguntas que afirmem existir backend de produção, integração externa operacional, interoperabilidade demonstrada ou segurança de infraestrutura já implantada.**

## 3. O que existe e o que o questionário pode afirmar

| Aspecto | Evidência na versão examinada | Consequência para o questionário |
| --- | --- | --- |
| Solicitação de exames | O médico pesquisa e seleciona exames em um catálogo. | Perguntar sobre facilidade de solicitar; retirar a afirmação de sugestão automática. |
| RCRI e VSG-CRI | Existe uma calculadora de simulação na cardiologia. | Avaliar a interação com os critérios e a leitura da pontuação, se essas tarefas forem realizadas. A existência do código não demonstra validade clínica. |
| EMAPO e ACP | Há campos de registro do resultado e da interpretação no formulário cardiológico. | Não apresentar os quatro escores como cálculos automáticos completos. |
| Resultado da simulação | A tela de simulação calcula pontuações; o formulário de avaliação registra resultados e parecer. | Não pressupor preenchimento automático ou persistência do resultado simulado no prontuário. Incluir essa distinção no roteiro. |
| Risco cirúrgico | A avaliação e o registro pertencem ao cardiologista. Clínico e cirurgião podem solicitar e consultar, conforme acesso. | Diferenciar solicitar, visualizar e registrar risco. |
| ASA | Registro do anestesista. | Aplicar perguntas sobre registro da ASA somente a quem executou essa tarefa. |
| Pareceres e documentos | Existem telas para registro, consulta e impressão, condicionadas às permissões. | Avaliar apenas o que o participante efetivamente utilizou. |
| Segurança | Há regras e restrições no protótipo, mas autenticação e persistência são locais no navegador. | O questionário pode avaliar entendimento dos acessos; não comprova confidencialidade técnica ou proteção de um ambiente de produção. |
| Integração externa | É uma proposta futura, ainda não implementada como módulo independente. | Excluir da avaliação funcional da versão atual. |

**Arquivos conferidos:** `components/shared/exam-request-form.tsx`, `components/shared/cardiology-risk-scores.tsx`, `app/(dashboard)/cardiologista/calculadora/page.tsx`, `app/(dashboard)/cardiologista/avaliar/[id]/page.tsx`, `app/(dashboard)/cirurgiao/avaliar/[id]/page.tsx`, `lib/surgical-risk-access.ts`, `lib/auth.tsx`, `lib/admin-access.ts` e `lib/permissions.ts`.

## 4. Cabeçalho, identificação e instruções

### 4.1. Alterar o título

Substituir “System Usability Scale (SUS) adaptada para a Plataforma Digital de Risco Cirúrgico” por:

> **Instrumento de avaliação do fluxo pré-operatório do MedRisk**  
> Parte I — Escala de Usabilidade de Sistema: versão brasileira adotada na pesquisa.  
> Parte II — Questões específicas sobre as funcionalidades testadas.  
> Parte III — Dificuldades e sugestões.

A redação final deve informar a referência bibliográfica da versão escolhida. Isso evita apresentar todos os itens como integrantes da SUS.

### 4.2. Reduzir identificadores

- Preferir **código do participante** a iniciais do nome.
- Esclarecer o significado de “número do registro”. Se for registro profissional, justificar a necessidade; se for código da pesquisa, renomear.
- Preferir registrar apenas se o participante atende aos critérios profissionais, quando o número do conselho não for necessário à análise.
- Se a assinatura for necessária ao procedimento de consentimento previsto na pesquisa, mantê-la no documento correspondente e separada das respostas sempre que viável. Não a remover de documentos obrigatórios sem verificar o protocolo.
- Não prometer anonimato se houver código reversível ou identificadores. Explicar a confidencialidade e o acesso restrito aos dados.

**Motivo:** iniciais, profissão, registro, assinatura e tempo de atuação podem permitir identificação, especialmente em uma equipe pequena. O texto enviado promete preservação da identidade; deve explicar o procedimento que sustentará essa promessa.

O TCLE e o protocolo não foram enviados. Portanto, esta revisão **não conclui que estejam ausentes ou inadequados**.

### 4.3. Acrescentar informações úteis à análise

```text
Código do participante: __________________
Data: __________  Versão do MedRisk avaliada: __________
Categoria profissional: __________________
Perfil utilizado no teste: __________________
Tempo de atuação profissional: __________
Experiência prévia com prontuários/sistemas hospitalares:
( ) Nenhuma  ( ) Ocasional  ( ) Frequente
Já utilizou o MedRisk? ( ) Não  ( ) Sim
Recebeu treinamento ou ajuda nesta sessão? ( ) Não  ( ) Sim
Tarefas realizadas: ___________________________________
```

Separar **categoria profissional** de **perfil usado na sessão**. Um profissional de TI navegando como cardiologista não equivale a um cardiologista avaliando a adequação clínica dos escores.

Não inserir automaticamente novas categorias na amostra: sua inclusão depende do objeto e dos critérios da pesquisa.

### 4.4. Separar as instruções por parte

**Para a Parte I:** seguir as instruções da versão SUS escolhida. A orientação sobre o ponto central não deve ser declarada um erro por si só: o texto original de Brooke prevê essa resposta quando o participante não consegue se posicionar sobre um item. Preservar as cinco alternativas e não acrescentar “não se aplica” à SUS por conta própria. Aplicar após uso suficiente e antes da discussão coletiva. [Brooke, 1996](https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf).

**Para a Parte II:** substituir a instrução geral por:

> Responda considerando apenas as tarefas realizadas no perfil utilizado durante o teste. Utilize a escala de 1 a 5. Se a funcionalidade não fizer parte das suas atribuições, assinale “Não se aplica ao meu perfil”. Se não tiver utilizado a funcionalidade, assinale “Não utilizei/não foi possível avaliar”. Essas alternativas não correspondem à resposta neutra 3.

Isso evita que falta de exposição ou restrição de acesso seja registrada como opinião neutra ou discordância.

## 5. Parte I — preservar a SUS, conferir a redação

Os dez itens enviados mantêm a lógica positiva/negativa da SUS. **Não recomendo retirar itens, acrescentar perguntas clínicas dentro da escala ou inverter a ordem.**

Entretanto, a redação não é uma reprodução identificada da versão brasileira consultada. Há diferenças de termos, como o uso de “profissionais” no item 7. Não é possível atribuir automaticamente à redação enviada as propriedades de uma versão publicada diferente. Recomendo escolher uma tradução brasileira publicada, adotar sua redação e documentar eventuais substituições contextuais. Uma referência possível é [Lourenço, Carmona e Lopes, 2022](https://aquichan.unisabana.edu.co/index.php/aquichan/article/download/16497/7157?inline=1).

**Não trocar o conteúdo do item 9 por proteção de dados:** a confiança ao utilizar o sistema, na SUS, não equivale à segurança da informação.

## 6. Revisão item a item da Parte II atual

| Item atual | Decisão recomendada | Justificativa e ajuste |
| --- | --- | --- |
| **11. Cadastro e dados clínicos simples e rápidos** | **Separar e condicionar ao perfil.** | Cadastro e registro clínico são tarefas distintas; simplicidade e rapidez também. O cadastro completo não é tarefa de todos os médicos. Perguntar sobre localização do paciente e registro da própria avaliação; avaliar cadastro em bloco específico, se houver recepção/triagem no estudo. Medir rapidez por tarefa, se for objetivo. |
| **12. Estratificação clara** | **Manter com precisão.** | Distinguir a interpretação de cada escore da classificação final registrada pelo cardiologista. Para outros médicos, avaliar leitura do parecer, não o ato de classificar. Não presumir geração automática da decisão. |
| **13. Informações suficientes para o perfil** | **Manter, com referência à tarefa.** | Usar “As informações disponíveis foram suficientes para executar a tarefa proposta no meu perfil”. Registrar o que faltou nos comentários. |
| **14. Sugestão automática de exames** | **Substituir.** | Não foi encontrada essa funcionalidade. Usar “Consegui selecionar os exames que desejava solicitar”. Não usar “adequada à conduta” para TI. |
| **15. Registro do parecer** | **Ajustar.** | O clínico também participa da avaliação. Perguntar sobre a avaliação correspondente ao perfil e usar perguntas específicas para parecer cardiológico, anestésico ou cirúrgico. TI avalia execução, não adequação médica. |
| **16. Exames, pendências e pareceres facilitaram comunicação** | **Dividir.** | Reúne três tipos de informação e um efeito sobre a equipe. Perguntar separadamente sobre localizar resultados, identificar pendências e consultar outro parecer. Comunicação real demanda exposição ao fluxo entre profissionais. |
| **17. Pode reduzir tempo até a liberação** | **Retirar do núcleo funcional ou manter como expectativa.** | Uma sessão de teste não mede redução real do tempo assistencial. Alternativa: “A organização do fluxo parece compatível com minha rotina de trabalho”. Se mantido o original, classificar como utilidade esperada e não eficácia demonstrada. |
| **18. Segurança e confidencialidade** | **Retirar como evidência técnica; reformular ou separar.** | O participante não verifica criptografia, proteção do armazenamento ou autorização no servidor pela aparência das telas. Perguntar sobre clareza das restrições por perfil; se a percepção de confiança for de interesse, analisá-la explicitamente como percepção. |
| **19. Recomendaria a plataforma** | **Pode permanecer.** | Mede aceitação/intenção de recomendação. Não demonstra efetividade, validade dos cálculos ou segurança. Evitar interpretar como intenção de adoção institucional já decidida. |

## 7. Bloco funcional sugerido para substituir a Parte II

**Este bloco é autoral e proposto para revisão e pré-teste. Não é uma nova escala validada e não integra o escore SUS.** Os códigos abaixo são novos; não correspondem à numeração original.

### Alternativas

- 1 — Discordo fortemente.
- 2 — Discordo.
- 3 — Não concordo nem discordo.
- 4 — Concordo.
- 5 — Concordo fortemente.
- NA — Não se aplica ao meu perfil.
- NU — Não utilizei/não foi possível avaliar.

### A. Questões comuns, condicionadas às tarefas testadas

| Código | Afirmação |
| --- | --- |
| F1 | Consegui localizar o paciente previsto no cenário de teste. |
| F2 | Consegui registrar as informações da avaliação correspondente ao meu perfil. |
| F3 | As informações disponíveis foram suficientes para executar a tarefa proposta. |
| F4 | Consegui selecionar os exames que desejava solicitar. |
| F5 | Consegui localizar os resultados dos exames disponibilizados no cenário. |
| F6 | Consegui identificar quais etapas do atendimento ainda estavam pendentes. |
| F7 | Consegui consultar o parecer de outra especialidade disponibilizado no cenário. |
| F8 | Consegui preparar para impressão o documento solicitado na tarefa. |
| F9 | Consideraria recomendar o MedRisk a profissionais com rotina semelhante à minha. |

**Nota de aplicação:** se o participante estiver apenas observando uma demonstração, não lhe atribuir execução de tarefas. Registrar essa condição e analisar separadamente. Para TI, F9 pode ser inaplicável; não exigir avaliação de rotina clínica que não possui.

### B. Perguntas específicas por perfil

Aplicar somente o bloco pertinente e apenas após realizar as tarefas correspondentes.

| Perfil | Afirmações propostas |
| --- | --- |
| **Clínico** | CL1 — Consegui solicitar a avaliação de risco ao cardiologista responsável. CL2 — Consegui acompanhar a situação da solicitação enviada. |
| **Cardiologista** | CA1 — Consegui identificar quais critérios estavam selecionados na simulação de escore. CA2 — A pontuação exibida na simulação estava apresentada de forma compreensível. CA3 — Consegui registrar o resultado e a interpretação de cada escore solicitado no cenário. CA4 — Consegui registrar minha classificação final e o parecer cardiológico. |
| **Anestesista** | AN1 — Consegui consultar o parecer cardiológico do cenário. AN2 — Consegui registrar a classificação ASA e meu parecer anestésico. |
| **Cirurgião** | CI1 — Consegui solicitar ou consultar a avaliação de risco cardiológico prevista na tarefa. CI2 — Consegui registrar minha avaliação cirúrgica sem alterar o risco registrado pela cardiologia. |
| **TI** | TI1 — As funcionalidades disponíveis corresponderam ao perfil utilizado. TI2 — As mensagens do sistema permitiram reconhecer o resultado das ações realizadas. |

Se for necessário investigar falhas de cada ação separadamente, dividir AN2 e CA4 no roteiro observacional. Evitar expandir o questionário indefinidamente; o registro de tarefa identifica qual etapa falhou.

**Não obrigar todo cardiologista a executar todos os escores.** Definir no cenário quais são pertinentes. Não usar uma resposta favorável a CA2/CA3 como evidência de correção matemática ou validade clínica.

### C. Acréscimos opcionais, sem compor o escore SUS

- **Adequação percebida à rotina:** “A organização das etapas parece compatível com minha rotina de trabalho”.
- **Entendimento dos acessos:** “Consegui identificar quais informações e ações estavam disponíveis para meu perfil”.
- **Cadastro, se estiver no escopo:** “Consegui localizar o paciente antes de iniciar um novo cadastro”. Aplicar a quem executou essa tarefa.
- **Feedback após salvar:** “Após salvar, consegui identificar se o registro foi concluído”. Útil para detectar incerteza sobre persistência.

Escolher esses itens conforme os objetivos, em vez de acrescentá-los todos por padrão.

## 8. Parte III — tornar os comentários mais úteis

Manter campo aberto, mas direcionar a resposta com três perguntas breves:

1. Em qual tarefa ou tela você encontrou maior dificuldade? O que aconteceu?
2. Qual informação ou funcionalidade necessária à sua tarefa estava ausente?
3. Qual mudança você considera prioritária?

Acrescentar:

> Não informe nomes, documentos ou outros dados identificáveis de pacientes ou colegas nos comentários.

## 9. Pontuação e análise — texto para substituir as orientações atuais

### SUS

> O escore SUS será calculado exclusivamente com os dez itens da Parte I: respostas dos itens ímpares menos 1; 5 menos as respostas dos itens pares; soma das contribuições multiplicada por 2,5. O resultado varia de 0 a 100. As questões funcionais não serão incluídas nesse cálculo. O tratamento de respostas ausentes será definido antes da coleta; não será produzido um escore comparável pela simples redução do número de itens. Referência: [Brooke, 1996](https://hci-studies.org/methods-and-measures/downloads/SUS_Brooke1996.pdf).

A fórmula enviada já está correta; essa substituição apenas explicita o tratamento metodológico.

**Retirar a tabela de faixas enquanto sua fonte e a escolha dos pontos de corte não estiverem documentadas.** Em particular, “68 ou mais” não deve ser automaticamente chamado de aceitável e “80 ou mais” de excelente sem indicar o modelo interpretativo adotado. Igualar 68 à referência também não equivale a estar acima dela.

O valor **68 é uma referência empírica frequentemente utilizada**, não um critério universal de aprovação para sistemas hospitalares. O escore não é percentual de aprovação nem de segurança. [Sauro — Measuring Usability with SUS](https://measuringu.com/sus/).

Minha recomendação de análise é apresentar número de participantes, média e dispersão do SUS; considerar mediana e intervalo interquartil e, quando houver condições amostrais, intervalo de confiança. Identificar os perfis e cenários incluídos. Comparações entre grupos com exposições diferentes devem ser tratadas como exploratórias.

### Parte II

> As respostas serão analisadas por item e, quando pertinente, por perfil. Serão apresentadas as frequências das alternativas 1 a 5, bem como NA, NU e respostas ausentes. A proporção favorável será calculada como o número de respostas 4 ou 5 dividido pelo número de respostas válidas de 1 a 5 naquele item. NA, NU e respostas ausentes ficarão fora desse denominador e terão sua frequência informada separadamente. Não será calculado um “SUS ampliado” com essas questões.

Exemplo: 8 participantes respondem 4 ou 5, 2 respondem 1 a 3 e 5 não avaliaram. A proporção favorável é **8/10 = 80%**, acompanhada de **10 respostas avaliáveis e 5 não avaliadas**, e não 8/15 sem explicação.

Não definir retrospectivamente um percentual de “validação” apenas porque os resultados foram favoráveis. Eventual critério de aceitação deve ser justificado previamente.

## 10. Roteiro mínimo para acompanhar o questionário

Sem um cenário comum, participantes podem responder sobre tarefas completamente diferentes. Sugiro:

1. Usar casos fictícios e contas adequadas a cada perfil; não usar a visualização administrativa somente de consulta para testar registros médicos.
2. Identificar versão, dispositivo e conjunto de tarefas da sessão.
3. Pedir que o profissional localize o paciente a ele direcionado.
4. Realizar as tarefas do perfil: avaliação, solicitação de exames, consulta a resultados, pedido ou emissão do parecer e preparação de um documento para impressão, conforme o escopo.
5. Incluir consulta a uma pendência e a um parecer já registrado por outra especialidade.
6. Registrar tarefa concluída, ajuda recebida, erro e tempo, sem confundir bloqueio esperado por permissão com falha de usabilidade.
7. Aplicar a SUS após o uso e antes da conversa de feedback; depois aplicar o bloco funcional e os comentários.

Se o objetivo incluir verificar escores, acrescentar **uma avaliação técnica e clínica separada**, com casos de referência, protocolo/versão identificados, resultados esperados e conferência por profissionais habilitados. O questionário de opinião não substitui essa etapa.

A hipótese de redução do tempo até a cirurgia exige indicadores e desenho de comparação próprios. A percepção colhida no formulário pode orientar melhorias, mas não demonstra esse desfecho.

## 11. O que não acrescentar nesta etapa

- Perguntas sobre integração com sistemas externos ainda não disponível para uso.
- Afirmações de que a plataforma calcula automaticamente EMAPO e ACP completos.
- Afirmações de que a plataforma determina autonomamente a liberação cirúrgica.
- Um novo escore único que misture SUS, funcionalidades, segurança e aceitação.
- Todos os módulos hospitalares se a pesquisa continuar restrita ao fluxo pré-operatório.
- Perguntas que peçam a TI para julgar conduta, adequação clínica de exames ou validade prognóstica.

## 12. Prioridades para edição

### Antes de aplicar

- [ ] Definir objeto, versão e tarefas avaliadas.
- [ ] Retirar “sugestão automática” do item 14.
- [ ] Documentar a versão brasileira da SUS e conferir sua redação.
- [ ] Separar instruções da SUS e do bloco funcional.
- [ ] Incluir NA/NU somente nas perguntas específicas.
- [ ] Distinguir tarefas e responsabilidades por perfil.
- [ ] Rever identificação e assinatura conforme o procedimento de pesquisa.
- [ ] Corrigir o enquadramento dos itens sobre tempo e segurança.
- [ ] Citar a interpretação do SUS e explicitar denominadores da Parte II.
- [ ] Fazer um pré-teste de compreensão e tempo do instrumento revisado.

**Conclusão:** a base é aproveitável. As mudanças centrais são retirar uma funcionalidade inexistente, respeitar os perfis, preservar a padronização da SUS e limitar as conclusões ao que foi efetivamente avaliado. A redação proposta neste arquivo é uma sugestão de revisão, não comprovação de validação científica do novo bloco autoral.
