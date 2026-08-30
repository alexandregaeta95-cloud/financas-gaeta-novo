# Diretrizes de Desenvolvimento do Projeto

## Regra de Filtro de Período Padrão
- Em todas as telas e módulos que possuem filtro de período (ex: Todos os Períodos / Mês Atual / Mês Passado / Período Personalizado), o valor padrão inicial (`default state`) deve ser **SEMPRE "Mês Atual"** (`CURRENT_MONTH` / `this_month` / `mes_atual` / `mes`), nunca "Todos os Períodos".
- Qualquer novo módulo ou tela com filtro temporal criado no projeto deve seguir estritamente essa convenção como ponto de partida.
