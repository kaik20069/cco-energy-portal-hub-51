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

    const ultraP = mP > thrP ? (mP - cP) : 0;
    const ultraF = mF > thrF ? (mF - cF) : 0;

    const baseP = Math.max(mP - ultraP, 0);
    const baseF = Math.max(mF - ultraF, 0);

    return {
      label: r.reference_label,
      ponta_base: baseP,
      fora_base: baseF,
      ultra_ponta: ultraP,
      ultra_fora: ultraF,
      contrato_p: cP,
      contrato_f: cF,
      ultra_total: ultraP + ultraF,
    };
  });
}

export default function DemandChart({ rows }: { rows: Row[] }) {
  const data = buildData(rows);

  // detectar séries vazias
  const sum = (k: string) => data.reduce((a, d) => a + (Number(d[k as keyof typeof d]) || 0), 0);
  const hasP = sum("ponta_base") > 0;
  const hasF = sum("fora_base") > 0;
  const hasUP = sum("ultra_ponta") > 0;
  const hasUF = sum("ultra_fora") > 0;
  const hasCP = sum("contrato_p") > 0;
  const hasCF = sum("contrato_f") > 0;

  if (!hasP && !hasF && !hasUP && !hasUF && !hasCP && !hasCF) return null;

  const maxBar = Math.max(
    ...data.map(d => (d.ponta_base + d.ultra_ponta)),
    ...data.map(d => (d.fora_base + d.ultra_fora)),
    0
  );
  const maxLine = Math.max(...data.map(d => Math.max(d.contrato_p || 0, d.contrato_f || 0, 0)));
  const maxY = Math.ceil(Math.max(maxBar, maxLine) * 1.08);

  const tickCount = Math.min(8, Math.max(6, Math.round(maxY / 100)));

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
        {hasCP && (d.contrato_p > 0) && <div style={{color: COLORS.contratoP}}>Contratada P: {fmt.format(d.contrato_p)} kW</div>}
        {hasCF && (d.contrato_f > 0) && <div style={{color: COLORS.contratoF}}>Contratada F: {fmt.format(d.contrato_f)} kW</div>}
      </div>
    );
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium mb-2">Demandas por período (kW)</div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={COLORS.grid} strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis
            domain={[0, maxY]}
            tickCount={tickCount}
            tickFormatter={(v) => fmt.format(v)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => ({
              ponta_base: "Ponta",
              fora_base: "Fora Ponta",
              ultra_ponta: "Ultrapassagem",
              ultra_fora: "Ultrapassagem",
              contrato_p: "Contratada P",
              contrato_f: "Contratada F",
            }[v] || v)}
          />

          {/* Barras base */}
          {hasP && (
            <Bar dataKey="ponta_base" name="Ponta" stackId="P" fill={COLORS.ponta} />
          )}
          {hasF && (
            <Bar dataKey="fora_base" name="Fora Ponta" stackId="F" fill={COLORS.fora} />
          )}

          {/* Ultrapassagem empilhada em cima de cada período */}
          {(hasUP || hasUF) && (
            <>
              {hasUP && <Bar dataKey="ultra_ponta" name="Ultrapassagem" stackId="P" fill={COLORS.ultra} />}
              {hasUF && <Bar dataKey="ultra_fora" name="Ultrapassagem" stackId="F" fill={COLORS.ultra} />}
            </>
          )}

          {/* Linhas de contrato (sóbrias) */}
          {hasCP && (
            <Line
              type="monotone"
              dataKey="contrato_p"
              name="Contratada P"
              stroke={COLORS.contratoP}
              strokeDasharray="6 4"
              dot={false}
              strokeWidth={2}
            />
          )}
          {hasCF && (
            <Line
              type="monotone"
              dataKey="contrato_f"
              name="Contratada F"
              stroke={COLORS.contratoF}
              strokeDasharray="6 4"
              dot={false}
              strokeWidth={2}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}