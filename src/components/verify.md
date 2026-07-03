Verificação concluída. Banco usar 0-index (Janeiro = 0). Todos componentes .tsx verificados. Tudo correto. Detalhes:

HolidayModal.tsx:

Select usar value={i} (0-11) -> 0-indexed.
Salvar DB usar mes: month direto -> 0-indexed.
Exibir usar MONTHS[h.month] -> Correto.
Status: OK.
BatchTimesheetModal.tsx:

State selectedMes iniciar new Date().getMonth() -> 0-indexed.
Select usar value={i} (0-11) -> 0-indexed.
Exibir recessos usar monthInicio + 1 -> Converte para 1-indexed para humano.
Status: OK.
ReportsModal.tsx:

Select usar value={i} (0-11) -> 0-indexed.
API req (getLancamentosRelatorio, getAdicionaNoturnoRelatorio) enviar filterMonth -> 0-indexed.
formatDate usar month + 1 -> Converte para humano.
isWeekday usar new Date(year, month, day) -> JS esperar 0-indexed, row do banco vir 0-indexed -> Perfeito.
Status: OK.
ReturnMemoModal.tsx:

Select usar value={i} (0-11) -> 0-indexed. State local sem outro uso.
todayLabel() usar MONTH_NAMES_PT[d.getMonth()] -> Correto.
parseDate() usar Number(m[2]) - 1 ao ler data digitada -> Converte 1-indexed para 0-indexed.
Status: OK.
TimesheetDeliveryModal.tsx:

Select usar value={i} (0-11) -> 0-indexed.
Exibir usar MONTHS[filterMonth] -> Correto.
Status: OK.
TimesheetGrid.tsx:

Bimestre calcular (Math.floor(month / 2) + 1) -> Exemplo: Jan(0) -> 1, Dez(11) -> 6. Correto.
Feriado/recesso check usar month 0-indexed.
isWeekend / getDayOfWeek usar new Date(year, month, day) -> Correto.
Dias no mês calcular new Date(year, month + 1, 0) -> Correto.
Status: OK.
TimesheetPreview.tsx:

isWeekend usar new Date(data.year, data.month, day) -> Correto.
Exibir usar MONTHS[data.month] -> Correto.
Status: OK.
TimesheetSummaryPreview.tsx, SummaryForm.tsx, EmployeeForm.tsx, EmployeeNavigator.tsx:

Sem lógica interna de data/mês ou conversão.
Status: OK (Não aplicável).
Nenhum erro de indexação de mês encontrado. Integração frontend-banco via 0-index está consistente em toda pasta components.
