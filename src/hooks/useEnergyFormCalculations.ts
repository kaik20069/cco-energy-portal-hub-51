import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  calcEconomiaLiquida,
  calcIcmsEnergia,
  calcPctEconomia,
  calcFatorPotenciaPeriodo,
  calcFatorPotenciaGlobal,
  calcKvarCorrigirPorDemanda,
  round4,
  trunc2,
} from "@/lib/energyCalc";

export interface EnergyFieldMap {
  compraEnergia?: string; // compra_energia_rs
  icmsRate?: string; // icms_rate
  rdbRate?: string; // rdb_rate
  icmsEnergia?: string; // icms_energia_rs

  faturaGeral?: string; // fatura_geral_rs
  faturaLivre?: string; // fatura_livre_rs
  encargos?: string; // encargos_rs
  bancoTrianon?: string; // banco_trianon_rs
  gestaoCco?: string; // gestao_cco_rs
  gestaoParceiro?: string; // gestao_parceiro_rs
  economiaLiquida?: string; // economia_liquida_rs
  economiaLiquidaPct?: string; // economia_liquida_pct

  energiaKwhPonta?: string; // energia_kwh_ponta
  energiaKwhFora?: string; // energia_kwh_fora
  energiaKwhReservado?: string; // energia_kwh_reservado
  mwhTotalGerador?: string; // mwh_total_gerador

  // Reactive fields
  reativoKvarhPonta?: string; // reativo_kvarh_ponta
  reativoKvarhFora?: string; // reativo_kvarh_fora
  reativoKvarhReservado?: string; // reativo_kvarh_reservado
  reativoExcedenteKvarh?: string; // reativo_excedente_kvarh
  reativoLimiteRate?: string; // reativo_limite_rate
  fatorPotencia?: string; // fator_potencia

  // Fator de Potência (planilha)
  demandaMaximaKw?: string; // demanda_maxima_kw
  fpParamMin?: string; // fp_param_min
  fpParamMax?: string; // fp_param_max
  fpPonta?: string; // fp_ponta
  fpFora?: string; // fp_fora
  fpRes?: string; // fp_res
  fpGlobal?: string; // fp_global
  kvarCorrigirMin?: string; // kvar_corrigir_min
  kvarCorrigirMax?: string; // kvar_corrigir_max
}

const defaults: Required<EnergyFieldMap> = {
  compraEnergia: "compra_energia_rs",
  icmsRate: "icms_rate",
  rdbRate: "rdb_rate",
  icmsEnergia: "icms_energia_rs",
  faturaGeral: "fatura_geral_rs",
  faturaLivre: "fatura_livre_rs",
  encargos: "encargos_rs",
  bancoTrianon: "banco_trianon_rs",
  gestaoCco: "gestao_cco_rs",
  gestaoParceiro: "gestao_parceiro_rs",
  economiaLiquida: "economia_liquida_rs",
  economiaLiquidaPct: "economia_liquida_pct",
  energiaKwhPonta: "energia_kwh_ponta",
  energiaKwhFora: "energia_kwh_fora",
  energiaKwhReservado: "energia_kwh_reservado",
  mwhTotalGerador: "mwh_total_gerador",
  reativoKvarhPonta: "reativo_kvarh_ponta",
  reativoKvarhFora: "reativo_kvarh_fora",
  reativoKvarhReservado: "reativo_kvarh_reservado",
  reativoExcedenteKvarh: "reativo_excedente_kvarh",
  reativoLimiteRate: "reativo_limite_rate",
  fatorPotencia: "fator_potencia",
  demandaMaximaKw: "demanda_maxima_kw",
  fpParamMin: "fp_param_min",
  fpParamMax: "fp_param_max",
  fpPonta: "fp_ponta",
  fpFora: "fp_fora",
  fpRes: "fp_res",
  fpGlobal: "fp_global",
  kvarCorrigirMin: "kvar_corrigir_min",
  kvarCorrigirMax: "kvar_corrigir_max",
};

function num(val: unknown): number {
  const n = typeof val === "string" ? parseFloat(val) : (val as number);
  return isNaN(n as number) ? 0 : (n as number);
}

function nearlyEqual(a: number, b: number, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

export function useEnergyFormCalculations<TValues extends Record<string, any>>(
  form: UseFormReturn<TValues>,
  map?: EnergyFieldMap
) {
  const fields = { ...defaults, ...(map || {}) };
  const { watch, setValue, getValues } = form;

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      // Normalize numeric values from the form
      const compraEnergia = num(value[fields.compraEnergia]);
      const icmsRate = num(value[fields.icmsRate]);
      const rdbRate = num(value[fields.rdbRate]);

      const faturaGeral = num(value[fields.faturaGeral]);
      const faturaLivre = num(value[fields.faturaLivre]);
      const encargos = num(value[fields.encargos]);
      const bancoTrianon = num(value[fields.bancoTrianon]);
      const gestaoCco = num(value[fields.gestaoCco]);
      const gestaoParceiro = num(value[fields.gestaoParceiro]);
      const icmsEnergiaCurrent = num(value[fields.icmsEnergia]);

      const energiaPonta = num(value[fields.energiaKwhPonta]);
      const energiaFora = num(value[fields.energiaKwhFora]);
      const energiaReservado = num(value[fields.energiaKwhReservado]);

      const reativoPonta = num(value[fields.reativoKvarhPonta]);
      const reativoFora = num(value[fields.reativoKvarhFora]);
      const reativoReservado = num(value[fields.reativoKvarhReservado]);
      const reativoLimite = num(value[fields.reativoLimiteRate]) || 0.62;

      // 1) Recalcular ICMS sobre energia quando editar alíquotas ou compra_energia_rs
      if (
        name === fields.icmsRate ||
        name === fields.rdbRate ||
        name === fields.compraEnergia
      ) {
        const icmsCalc = calcIcmsEnergia(compraEnergia, icmsRate, rdbRate);
        if (!nearlyEqual(icmsCalc, icmsEnergiaCurrent)) {
          setValue(fields.icmsEnergia as any, icmsCalc as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
      }

      const icmsEnergia = num(getValues(fields.icmsEnergia as any));

      // 2) Recalcular economia líquida e percentual ao editar totais
      if (
        name === fields.faturaGeral ||
        name === fields.faturaLivre ||
        name === fields.compraEnergia ||
        name === fields.icmsEnergia ||
        name === fields.encargos ||
        name === fields.bancoTrianon ||
        name === fields.gestaoCco ||
        name === fields.gestaoParceiro ||
        name === fields.icmsRate ||
        name === fields.rdbRate
      ) {
        const economia = calcEconomiaLiquida({
          faturaGeral,
          faturaLivre,
          compraEnergia,
          icmsEnergia,
          encargos,
          bancoTrianon,
          gestaoCco,
          gestaoParceiro,
        });
        const pct = calcPctEconomia(economia, faturaGeral);

        const curEcon = num(getValues(fields.economiaLiquida as any));
        const curPct = num(getValues(fields.economiaLiquidaPct as any));

        if (!nearlyEqual(economia, curEcon)) {
          setValue(fields.economiaLiquida as any, economia as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
        if (!nearlyEqual(pct, curPct)) {
          setValue(fields.economiaLiquidaPct as any, pct as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
      }

      // 3) Atualizar mwh_total_gerador ao editar energias_kwh
      if (
        name === fields.energiaKwhPonta ||
        name === fields.energiaKwhFora ||
        name === fields.energiaKwhReservado
      ) {
        const mwh = round4((energiaPonta + energiaFora + energiaReservado) / 1000);
        const curMwh = num(getValues(fields.mwhTotalGerador as any));
        if (!nearlyEqual(mwh, curMwh)) {
          setValue(fields.mwhTotalGerador as any, mwh as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
      }

      // 4) Calcular reativo excedente e fator de potência (básico)
      if (
        name === fields.energiaKwhPonta ||
        name === fields.energiaKwhFora ||
        name === fields.energiaKwhReservado ||
        name === fields.reativoKvarhPonta ||
        name === fields.reativoKvarhFora ||
        name === fields.reativoKvarhReservado ||
        name === fields.reativoLimiteRate
      ) {
        const totalEnergia = energiaPonta + energiaFora + energiaReservado;
        const totalReativo = reativoPonta + reativoFora + reativoReservado;
        
        // Calcular reativo excedente
        const reativoPermitido = totalEnergia * reativoLimite;
        const reativoExcedente = Math.max(0, totalReativo - reativoPermitido);
        
        // Calcular fator de potência: FP = kWh / sqrt(kWh² + kvarh²)
        const aparente = Math.sqrt(totalEnergia * totalEnergia + totalReativo * totalReativo);
        const fatorPotencia = aparente > 0 ? totalEnergia / aparente : 1;

        const curReativoExcedente = num(getValues(fields.reativoExcedenteKvarh as any));
        const curFatorPotencia = num(getValues(fields.fatorPotencia as any));

        if (!nearlyEqual(reativoExcedente, curReativoExcedente)) {
          setValue(fields.reativoExcedenteKvarh as any, round4(reativoExcedente) as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
        if (!nearlyEqual(fatorPotencia, curFatorPotencia)) {
          setValue(fields.fatorPotencia as any, round4(fatorPotencia) as any, {
            shouldDirty: true,
            shouldValidate: false,
          });
        }
      }

      // 5) Calcular Fatores de Potência por período e correção por demanda (planilha)
      if (
        name === fields.energiaKwhPonta ||
        name === fields.energiaKwhFora ||
        name === fields.energiaKwhReservado ||
        name === fields.reativoKvarhPonta ||
        name === fields.reativoKvarhFora ||
        name === fields.reativoKvarhReservado ||
        name === fields.demandaMaximaKw ||
        name === fields.fpParamMin ||
        name === fields.fpParamMax
      ) {
        const demandaMaxima = num(value[fields.demandaMaximaKw]);
        const fpParamMin = num(value[fields.fpParamMin]);
        const fpParamMax = num(value[fields.fpParamMax]);

        // FP por período (4 casas)
        const fpPonta = calcFatorPotenciaPeriodo(energiaPonta, reativoPonta);
        const fpFora = calcFatorPotenciaPeriodo(energiaFora, reativoFora);
        const fpRes = calcFatorPotenciaPeriodo(energiaReservado, reativoReservado);
        
        // FP global (4 casas)
        const totalEnergia = energiaPonta + energiaFora + energiaReservado;
        const totalReativo = reativoPonta + reativoFora + reativoReservado;
        const fpGlobal = calcFatorPotenciaGlobal(totalEnergia, totalReativo);

        // kVAr de correção por DEMANDA (2 casas)
        const kvarCorrigirMin = fpGlobal ? trunc2(calcKvarCorrigirPorDemanda(fpGlobal, demandaMaxima, fpParamMin || 0.92)) : 0;
        const kvarCorrigirMax = fpGlobal ? trunc2(calcKvarCorrigirPorDemanda(fpGlobal, demandaMaxima, fpParamMax || 0.94)) : 0;

        // Atualizar campos calculados
        const updates = [
          { field: fields.fpPonta, value: fpPonta !== null ? round4(fpPonta) : null },
          { field: fields.fpFora, value: fpFora !== null ? round4(fpFora) : null },
          { field: fields.fpRes, value: fpRes !== null ? round4(fpRes) : null },
          { field: fields.fpGlobal, value: fpGlobal !== null ? round4(fpGlobal) : null },
          { field: fields.kvarCorrigirMin, value: kvarCorrigirMin },
          { field: fields.kvarCorrigirMax, value: kvarCorrigirMax },
        ];

        updates.forEach(({ field, value }) => {
          const current = getValues(field as any);
          const newValue = value ?? 0;
          if (!nearlyEqual(num(current), num(newValue))) {
            setValue(field as any, newValue as any, {
              shouldDirty: true,
              shouldValidate: false,
            });
          }
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [watch, setValue, getValues]);
}
