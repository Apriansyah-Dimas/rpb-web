import { Parser } from "expr-eval";
import type { Dimensions, PanelThickness } from "@/types/rpb";

export interface FormulaContext extends Dimensions {
  panel_thickness: number;
  panelThickness: number;
}

export type FormulaVariables = Record<string, number>;

const parser = new Parser({
  operators: {
    assignment: false,
    comparison: false,
    concatenate: false,
    conditional: false,
    logical: false,
    in: false,
  },
});

const withFormulaAliases = (ctx: FormulaVariables) => ({
  ...ctx,
  p: Number(ctx.panel_thickness ?? 0),
  t: Number(ctx.panel_thickness ?? 0),
  __length_var: Number(ctx.length ?? 0),
});

const preprocessPercentLiterals = (expression: string): string =>
  expression.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");

const normalizeDecimalComma = (expression: string): string =>
  expression.replace(/(\d),(\d)/g, "$1.$2");

// `length` is reserved by expr-eval internals; remap variable token to a safe alias.
const remapReservedVariableTokens = (expression: string): string =>
  expression.replace(/\blength\b(?!\s*\()/gi, "__length_var");

const customFunctions = {
  ROUND: (value: number, digits = 0) => {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
  CEIL: (value: number) => Math.ceil(value),
  FLOOR: (value: number) => Math.floor(value),
  ABS: (value: number) => Math.abs(value),
  MAX: (...values: number[]) => Math.max(...values),
  MIN: (...values: number[]) => Math.min(...values),
  PCT: (base: number, pct: number) => base * (pct / 100),
  PERSEN: (base: number, pct: number) => base * (pct / 100),
};

Object.assign(parser.functions, customFunctions);

export const buildFormulaContext = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
): FormulaContext => ({
  length: Number.isFinite(dimensions.length) ? Math.max(0, dimensions.length) : 0,
  width: Number.isFinite(dimensions.width) ? Math.max(0, dimensions.width) : 0,
  height: Number.isFinite(dimensions.height) ? Math.max(0, dimensions.height) : 0,
  panel_thickness: panelThickness,
  panelThickness: panelThickness,
});

export const evaluateFormulaQuantity = (
  formulaExpr: string,
  context: FormulaVariables,
): number => {
  if (!formulaExpr || formulaExpr.trim().length === 0) {
    return 0;
  }

  try {
    const expression = remapReservedVariableTokens(
      normalizeDecimalComma(preprocessPercentLiterals(formulaExpr.trim())),
    );
    const compiled = parser.parse(expression);
    const value = compiled.evaluate(withFormulaAliases(context));

    if (typeof value !== "number" || !Number.isFinite(value)) {
      return 0;
    }

    return Math.max(0, value);
  } catch {
    return 0;
  }
};

export const validateFormulaExpression = (formulaExpr: string): string | null => {
  try {
    const expression = remapReservedVariableTokens(
      normalizeDecimalComma(preprocessPercentLiterals(formulaExpr.trim())),
    );
    parser.parse(expression);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Formula tidak valid.";
  }
};
