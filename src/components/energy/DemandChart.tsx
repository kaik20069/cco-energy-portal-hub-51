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
    const cF = Number(r.demanda_contratada_kw_fora) || 0;   // contratada fora
    const mF = Number(r.demanda_faturada_kw_fora) || 0;      // medida fora
    const cP = Number(r.demanda_contratada_kw_ponta) || 0;   // contratada ponta
    const mP = Number(r.demanda_faturada_kw_ponta) || 0;     // medida ponta

    // Ultrapassa? (gatilho = 5% acima da contratada)
    const ultraF = mF > cF * 1.05 ? Math.max(0, mF - cF) : 0;
    const baseF  = mF - ultraF;   // parte verde (até a contratada ou a medida se não ultrapassou)

    const ultraP = mP > cP * 1.05 ? Math.max(0, mP - cP) : 0;
    const baseP  = mP - ultraP;

    return {
      reference_label: r.reference_label,
      base_fora: baseF,
      ultra_fora: ultraF,
      base_ponta: baseP,
      ultra_ponta: ultraP,
      contratada_fora: cF,
      contratada_ponta: cP,
    };
  });
}

export default function DemandChart({ rows }: { rows: Row[] }) {
  const data = buildData(rows);

  // detectar séries vazias
  const sum = (k: string) => data.reduce((a, d) => a + (Number(d[k as keyof typeof d]) || 0), 0);
  const hasBaseF = sum("base_fora") > 0;
  const hasBaseP = sum("base_ponta") > 0;
  const hasUltraF = sum("ultra_fora") > 0;
  const hasUltraP = sum("ultra_ponta") > 0;
  const hasCP = sum("contratada_ponta") > 0;
  const hasCF = sum("contratada_fora") > 0;

  if (!hasBaseF && !hasBaseP && !hasUltraF && !hasUltraP && !hasCP && !hasCF) return null;

  const maxBar = Math.max(...data.map(d =>
    Math.max(d.base_fora + d.ultra_fora, d.base_ponta + d.ultra_ponta)
  ), 0);

  const maxLine = Math.max(...data.map(d =>
    Math.max(d.contratada_fora, d.contratada_ponta)
  ), 0);

  // garante que a linha contratada e as barras cabem com folga
  const topo = Math.max(maxBar, maxLine * 1.05);
  const step = topo <= 200 ? 25 : topo <= 600 ? 50 : 100; // "degrau" amigável
  const yMax = Math.ceil((topo * 1.08) / step) * step;

  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium mb-2">Demandas por período (kW)</div>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 12, bottom: 8, left: 12 }}
          barCategoryGap="35%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="reference_label"
            type="category"
            allowDuplicatedCategory={false}
            padding={{ left: 0, right: 0 }}
          />
          <YAxis
            domain={[0, yMax]}
            tickCount={Math.min(8, Math.max(4, Math.floor(yMax / step) + 1))}
            tickFormatter={(v) => new Intl.NumberFormat('pt-BR').format(v)}
          />

          {/* Barras empilhadas: verde (medida até a contratada) + vermelho (ultrapassagem a partir da contratada) */}
          {hasBaseF && (
            <Bar dataKey="base_fora" stackId="F" name="Fora Ponta" fill="#10B981" />
          )}
          {hasUltraF && (
            <Bar dataKey="ultra_fora" stackId="F" name="Ultrapassagem" fill="#EF4444" />
          )}

          {hasBaseP && (
            <Bar dataKey="base_ponta" stackId="P" name="Ponta" fill="#2563EB" />
          )}
          {hasUltraP && (
            <Bar dataKey="ultra_ponta" stackId="P" name="Ultrapassagem" fill="#EF4444" />
          )}

          {/* Linhas contratadas como degrau, saindo do eixo Y */}
          {hasCF && (
            <Line
              type="stepAfter"
              dataKey="contratada_fora"
              name="Contratada Fora"
              stroke="#0EA5E9" strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}
          {hasCP && (
            <Line
              type="stepAfter"
              dataKey="contratada_ponta"
              name="Contratada Ponta"
              stroke="#6B7280" strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
          )}

          <Tooltip
            formatter={(value, name, key) => {
              const v = Number(value || 0);
              if (!v) return null; // oculta itens zerados do tooltip
              return [new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(v) + ' kW', name];
            }}
            labelFormatter={(lab) => `${lab}`}
          />
          <Legend
            formatter={(value) => {
              // legenda limpa
              if (value === 'base_fora') return 'Fora Ponta';
              if (value === 'base_ponta') return 'Ponta';
              if (value === 'ultra_fora' || value === 'ultra_ponta') return 'Ultrapassagem';
              if (value === 'contratada_fora') return 'Contratada Fora';
              if (value === 'contratada_ponta') return 'Contratada Ponta';
              return value;
            }}
            payload={undefined}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}