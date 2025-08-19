import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from "recharts";

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

type Row = {
  reference_label: string;

  // medidos para cobrança (usamos *faturada*)
  demanda_faturada_kw_ponta?: number;
  demanda_faturada_kw_fora?: number;

  // contratos do mês
  demanda_contratada_kw_ponta?: number;
  demanda_contratada_kw_fora?: number;
};

// cores sóbrias
const COLORS = {
  ponta: "#2563EB",              // azul
  fora: "#10B981",               // verde
  ultra: "#EF4444",              // vermelho
  contratoP: "#334155",          // slate-700 (contrato Ponta)
  contratoF: "#0EA5E9",          // cyan-500 (contrato Fora)
  grid: "#E5E7EB",
};

function buildData(rows: Row[]) {
  return rows.map(r => {
    const mP = Number(r.demanda_faturada_kw_ponta) || 0;
    const mF = Number(r.demanda_faturada_kw_fora) || 0;
    const cP = Number(r.demanda_contratada_kw_ponta) || 0;
    const cF = Number(r.demanda_contratada_kw_fora) || 0;

    const thrP = cP * 1.05;
    const thrF = cF * 1.05;

    const ponta_base = Math.min(mP, thrP);
    const fora_base = Math.min(mF, thrF);
    const ponta_ultra = Math.max(0, mP - thrP);
    const fora_ultra = Math.max(0, mF - thrF);

    return {
      label: r.reference_label,
      ponta_base: ponta_base,
      fora_base: fora_base,
      ponta_ultra: ponta_ultra,
      fora_ultra: fora_ultra,
      contratada_ponta: cP,
      contratada_fora: cF,
      ultra_total: ponta_ultra + fora_ultra,
    };
  });
}

export default function DemandChart({ rows }: { rows: Row[] }) {
  const data = buildData(rows);

  // detectar séries vazias
  const sum = (k: string) => data.reduce((a, d) => a + (Number(d[k as keyof typeof d]) || 0), 0);
  const hasP = sum("ponta_base") > 0;
  const hasF = sum("fora_base") > 0;
  const hasUP = sum("ponta_ultra") > 0;
  const hasUF = sum("fora_ultra") > 0;
  const hasCP = sum("contratada_ponta") > 0;
  const hasCF = sum("contratada_fora") > 0;

  if (!hasP && !hasF && !hasUP && !hasUF && !hasCP && !hasCF) return null;

  const maxBar = Math.max(
    ...data.map(d => (d.ponta_base + d.ponta_ultra)),
    ...data.map(d => (d.fora_base + d.fora_ultra)),
    0
  );
  const maxLine = Math.max(...data.map(d => Math.max(d.contratada_ponta || 0, d.contratada_fora || 0, 0)));
  const maxY = Math.ceil(Math.max(maxBar, maxLine) * 1.1);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    // pegar valores atuais
    const d = data.find(x => x.label === label);
    if (!d) return null;

    return (
      <div className="rounded-md border bg-background px-3 py-2 shadow-sm text-sm">
        <div className="font-medium mb-1">{label}</div>
        {hasP && (d.ponta_base > 0) && <div style={{color: COLORS.ponta}}>Ponta: {fmt.format(d.ponta_base)} kW</div>}
        {hasF && (d.fora_base > 0) && <div style={{color: COLORS.fora}}>Fora Ponta: {fmt.format(d.fora_base)} kW</div>}
        {(d.ultra_total > 0) && <div style={{color: COLORS.ultra}}>Ultrapassagem: {fmt.format(d.ultra_total)} kW</div>}
        {hasCP && (d.contratada_ponta > 0) && <div style={{color: COLORS.contratoP}}>Contratada Ponta: {fmt.format(d.contratada_ponta)} kW</div>}
        {hasCF && (d.contratada_fora > 0) && <div style={{color: COLORS.contratoF}}>Contratada Fora: {fmt.format(d.contratada_fora)} kW</div>}
      </div>
    );
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium mb-2">Demandas por período (kW)</div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart 
          data={data} 
          margin={{ top: 10, right: 20, bottom: 0, left: 0 }}
          barCategoryGap="30%"
          barGap={2}
        >
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis 
            dataKey="label" 
            type="category" 
            scale="point" 
            padding={{ left: 0, right: 0 }} 
          />
          <YAxis
            domain={[0, 'dataMax + 10%']}
            tickFormatter={(v) => fmt.format(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => ({
              ponta_base: "Ponta",
              fora_base: "Fora Ponta", 
              ponta_ultra: "Ultrapassagem",
              fora_ultra: "Ultrapassagem",
              contratada_ponta: "Contratada Ponta",
              contratada_fora: "Contratada Fora",
            }[v] || v)}
          />

          {/* Barras empilhadas por demanda */}
          {hasP && (
            <Bar dataKey="ponta_base" name="Ponta" stackId="demand" fill={COLORS.ponta} />
          )}
          {hasUP && (
            <Bar dataKey="ponta_ultra" name="Ultrapassagem" stackId="demand" fill={COLORS.ultra} />
          )}
          {hasF && (
            <Bar dataKey="fora_base" name="Fora Ponta" stackId="demand" fill={COLORS.fora} />
          )}
          {hasUF && (
            <Bar dataKey="fora_ultra" name="Ultrapassagem" stackId="demand" fill={COLORS.ultra} />
          )}

          {/* Linhas de contrato em degraus */}
          {hasCP && (
            <Line
              type="stepAfter"
              dataKey="contratada_ponta"
              name="Contratada Ponta"
              stroke={COLORS.fora}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
          )}
          {hasCF && (
            <Line
              type="stepAfter"
              dataKey="contratada_fora"
              name="Contratada Fora"
              stroke={COLORS.contratoF}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}