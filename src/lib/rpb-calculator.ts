import {
  KONSTRUKSI_TOTAL_USD,
  PROFILE_UNIT_PRICES_BY_THICKNESS,
  USD_TO_IDR,
} from "@/lib/rpb-data";
import type { Dimensions, PanelThickness } from "@/types/rpb";

const RUPIAH_FORMATTER = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const safe = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(value, 0);
};

export const sanitizeDimensions = (dimensions: Dimensions): Dimensions => ({
  length: safe(dimensions.length),
  width: safe(dimensions.width),
  height: safe(dimensions.height),
});

export const calculateProfileQuantities = (dimensions: Dimensions): number[] => {
  const d = sanitizeDimensions(dimensions);
  const length = d.length;
  const width = d.width;
  const height = d.height;

  const panel =
    (((width * length + width * height + length * height) / 3_600_000) * 2) *
    1.4;
  const cornerProfil = (((width + width + length + height) * 4) / 5600) * 2;
  const omegaProfil = ((length / 1200) * ((2 * width + 2 * height) / 5600) * 1.3) * 3;
  const corner = 24;
  const pinchplate = (cornerProfil + omegaProfil) * 2;
  const roundRubber = pinchplate * 5.6;
  const flatRubber = pinchplate * 5.6;
  const angleBlock = corner * 3;
  const omegaJoin = (length / 1200) * 8 * 1.2;
  const handle = 0;
  const door = 5;
  const hinge = 0;
  const damper = 5;
  const screwHouse = panel * 28;
  const pvc45p = omegaProfil * 6;
  const pa6045t = omegaProfil * 6;

  return [
    panel,
    cornerProfil,
    omegaProfil,
    corner,
    pinchplate,
    roundRubber,
    flatRubber,
    angleBlock,
    omegaJoin,
    handle,
    door,
    hinge,
    damper,
    screwHouse,
    pvc45p,
    pa6045t,
  ];
};

export const calculateProfileTotalUsd = (
  dimensions: Dimensions,
  panelThickness: PanelThickness,
): number => {
  const qty = calculateProfileQuantities(dimensions);
  const prices = PROFILE_UNIT_PRICES_BY_THICKNESS[panelThickness];

  return qty.reduce((sum, q, index) => sum + q * prices[index], 0);
};

export const calculateKonstruksiTotalUsd = (): number => KONSTRUKSI_TOTAL_USD;

export const usdToIdr = (usdValue: number): number => usdValue * USD_TO_IDR;

export const formatRupiah = (value: number): string =>
  RUPIAH_FORMATTER.format(value);

export const formatUsd = (value: number): string => USD_FORMATTER.format(value);
