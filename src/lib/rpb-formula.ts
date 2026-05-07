import { create, all, type MathJsInstance } from "mathjs";
import type { Dimensions, PanelThickness } from "@/types/rpb";

const math: MathJsInstance = create(all, {
  number: "number",
  precision: 64,
});

const customFunctions = {
  ROUND: (value: number, digits: number = 0) => {
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
  IF: (condition: number, valueIfTrue: number, valueIfFalse: number) =>
    condition ? valueIfTrue : valueIfFalse,
};

const preprocessPercentLiterals = (expression: string): string =>
  expression.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");

const normalizeDecimalComma = (expression: string): string =>
  expression.replace(/(\d),(\d)/g, "$1.$2");

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
    const expression = normalizeDecimalComma(
      preprocessPercentLiterals(formulaExpr.trim()),
    );

    const scope = {
      ...context,
      p: Number(context.panel_thickness ?? 0),
      t: Number(context.panel_thickness ?? 0),
      ...customFunctions,
    };

    const value = math.evaluate(expression, scope);

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
    const expression = normalizeDecimalComma(
      preprocessPercentLiterals(formulaExpr.trim()),
    );

    const scope = {
      length: 0,
      width: 0,
      height: 0,
      panel_thickness: 30,
      panelThickness: 30,
      p: 30,
      t: 30,
      ...customFunctions,
    };

    math.evaluate(expression, scope);
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Formula tidak valid.";
  }
};

export interface FormulaContext extends Dimensions {
  panel_thickness: number;
  panelThickness: number;
}

export type FormulaVariables = Record<string, number>;
