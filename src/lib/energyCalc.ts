// arredonda para 4 casas
export const round4 = (x: number) => Math.round(x * 1e4) / 1e4;

// trunca para 2 casas (como Excel TRUNCAR)
export const trunc2 = (x: number) => (x >= 0 ? Math.floor(x * 100) : Math.ceil(x * 100)) / 100;

// ICMS sobre energia (equivalente ao Excel):
// =TRUNCAR((TRUNCAR(J/(1-ARRED(V-(V*W);4));2))*ARRED(V-(V*W);4);2)
export function calcIcmsEnergia(compraEnergia: number, icmsRate: number, rdbRate: number) {
  const eff = round4(icmsRate - icmsRate * rdbRate);
  const base = trunc2(compraEnergia / (1 - eff || 1));
  return trunc2(base * eff);
}

// Economia líquida R$:
// = D - (F + J + L + M + N + O + P)
export function calcEconomiaLiquida({
  faturaGeral,
  faturaLivre,
  compraEnergia,
  icmsEnergia,
  encargos,
  bancoTrianon,
  gestaoCco,
  gestaoParceiro,
}: {
  faturaGeral: number;
  faturaLivre: number;
  compraEnergia: number;
  icmsEnergia: number;
  encargos: number;
  bancoTrianon: number;
  gestaoCco: number;
  gestaoParceiro: number;
}) {
  return trunc2(
    faturaGeral -
      (faturaLivre +
        compraEnergia +
        icmsEnergia +
        encargos +
        bancoTrianon +
        gestaoCco +
        gestaoParceiro)
  );
}

export const calcPctEconomia = (economia: number, faturaGeral: number) =>
  faturaGeral ? +(economia / faturaGeral).toFixed(5) : 0;

// Calcular reativo excedente
export function calcReativoExcedente(totalEnergia: number, totalReativo: number, limite = 0.62) {
  const reativoPermitido = totalEnergia * limite;
  return Math.max(0, totalReativo - reativoPermitido);
}

// Calcular fator de potência
export function calcFatorPotencia(totalEnergia: number, totalReativo: number) {
  const aparente = Math.sqrt(totalEnergia * totalEnergia + totalReativo * totalReativo);
  return aparente > 0 ? totalEnergia / aparente : 0;
}

// Calcular fator de potência por período (exato da planilha)
export function calcFatorPotenciaPeriodo(energia: number, reativo: number) {
  if (energia <= 0) return null;
  return 1 / Math.sqrt(1 + Math.pow(reativo / energia, 2));
}

// Calcular fator de potência global
export function calcFatorPotenciaGlobal(totalEnergia: number, totalReativo: number) {
  if (totalEnergia <= 0) return null;
  return 1 / Math.sqrt(1 + Math.pow(totalReativo / totalEnergia, 2));
}

// Calcular kVAr de correção por demanda
export function calcKvarCorrigirPorDemanda(
  fpGlobal: number | null,
  demandaMaxima: number,
  fpMeta: number
) {
  if (!fpGlobal || demandaMaxima <= 0) return 0;
  
  const tanAtual = Math.tan(Math.acos(Math.min(1, Math.max(0, fpGlobal))));
  const tanMeta = Math.tan(Math.acos(Math.min(1, Math.max(0, fpMeta))));
  
  return Math.max(0, demandaMaxima * (tanAtual - tanMeta));
}

// parsing/sort do mês "ago/24":
const meses = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function parseRefLabel(label: string) {
  // "ago/24"
  const [m, yy] = label.toLowerCase().split("/");
  const month = meses.indexOf(m) + 1;
  const year = 2000 + parseInt(yy, 10);
  return { year, month };
}

export function sortByRefLabel(a: string, b: string) {
  const A = parseRefLabel(a),
    B = parseRefLabel(b);
  return A.year !== B.year ? A.year - B.year : A.month - B.month;
}
