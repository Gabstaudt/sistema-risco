# Registro de classificação de risco de Manchester

A triagem registra a decisão do enfermeiro: fluxograma utilizado, discriminador identificado, prioridade e tempo-alvo, com responsável e data da classificação ao concluir. Rascunhos podem permanecer incompletos. Os códigos de prioridade existentes são preservados para as filas atuais.

Tempos-alvo de atendimento: vermelho imediato; laranja 10 minutos; amarelo 60; verde 120; azul 240. Não são garantia de espera nem instrução para retardar assistência. A aplicação usa a escolha manual do profissional e não infere prioridade por sinais vitais ou comorbidades.

A ASA foi retirada da tela e dos registros de triagem; sua fonte na ficha compartilhada passou a ser `anesthesiaAssessment.asaClassification`. O campo legado de triagem permanece tipado por compatibilidade, mas não é usado nem recriado na hidratação. A avaliação anestésica mantém seu campo de ASA.

## Fontes pesquisadas

- Cofen, Resolução 661/2021: classificação de risco privativa do enfermeiro no âmbito da equipe de enfermagem, com capacitação específica no protocolo institucional. https://www.cofen.gov.br/resolucao-cofen-no-661-2021/
- GBCR, nota técnica: escolha de fluxograma pela queixa e discriminadores para identificar a prioridade. https://www.gbcr.org.br/wp-content/uploads/2024/07/Nota-Tecnica-GBCR-Pais-preocupados-mal-estar.pdf
- Secretaria de Saúde de Alagoas: cinco níveis de Manchester e respectivos tempos-alvo. https://www.saude.al.gov.br/hospital-ib-gatto-falcao-segue-protocolo-de-manchester-para-atendimento-de-pacientes/

## Integração clínica

O registro não implementa os algoritmos oficiais do protocolo. Fluxogramas e discriminadores são informados pelo enfermeiro a partir do material adotado pelo hospital. Para oferecer seleção validada ou classificação assistida, integrar o catálogo oficial vigente e validar o fluxo com a equipe de enfermagem. O backend deve validar a autorização do profissional, a correspondência entre fluxograma/discriminador/prioridade e a versão do protocolo institucional.
