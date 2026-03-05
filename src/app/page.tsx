"use client";

import {
  calculateKonstruksiBreakdown,
  calculateKonstruksiTotalIdr,
  calculateProfileBreakdown,
  calculateProfileTotalIdr,
  type CalculatedFixedItem,
  formatRupiah,
} from "@/lib/rpb-calculator";
import { RpbPageFrame } from "@/components/layout/rpb-page-frame";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { useRpbStore } from "@/store/rpb-store";
import type { DimensionKey, OtherItem, StockCategory } from "@/types/rpb";
import { ArrowRight, ChevronDown, ChevronUp, Plus, Search } from "lucide-react";
import Link from "next/link";
import type { FocusEvent } from "react";
import { useMemo, useState } from "react";

type OtherFilter = "Semua" | StockCategory | string;

const normalizeNumericInput = (value: string): string => {
  const normalizedDot = value.replace(",", ".");

  if (normalizedDot === "" || normalizedDot === "." || normalizedDot === "-") {
    return normalizedDot;
  }

  if (normalizedDot.startsWith("0.") || normalizedDot.startsWith("-0.")) {
    return normalizedDot;
  }

  return normalizedDot.replace(/^(-?)0+(?=\d)/, "$1");
};

const parseNumberInput = (value: string): number => {
  const parsed = Number.parseFloat(normalizeNumericInput(value));
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return parsed;
};

const selectInputOnFocus = (event: FocusEvent<HTMLInputElement>) => {
  event.currentTarget.select();
};

const formatQty = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toLocaleString("id-ID", { maximumFractionDigits: 3 });
};

const FixedBreakdownPanel = ({
  items,
  emptyText,
  totalLabel,
  totalValue,
}: {
  items: CalculatedFixedItem[];
  emptyText: string;
  totalLabel: string;
  totalValue: number;
}) => (
  <div className="mt-3 overflow-hidden rounded-xl border border-rpb-border bg-white">
    {items.length === 0 ? (
      <p className="px-4 py-3 text-xs text-rpb-ink-soft">{emptyText}</p>
    ) : (
      <div className="divide-y divide-rpb-border">
        {items.map((item) => (
          <div
            key={item.id}
            className="grid gap-1 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
              <p className="text-xs text-rpb-ink-soft">
                {formatQty(item.qty)} {item.unit} x {formatRupiah(item.unitPriceIdr)}
              </p>
            </div>
            <p className="text-sm font-semibold text-foreground md:text-right">
              {formatRupiah(item.totalIdr)}
            </p>
          </div>
        ))}
      </div>
    )}

    <div className="flex items-center justify-between border-t border-rpb-border bg-[#e9f4fa] px-4 py-2 text-sm font-semibold">
      <span>{totalLabel}</span>
      <span>{formatRupiah(totalValue)}</span>
    </div>
  </div>
);

const DimensionInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (nextValue: number) => void;
}) => (
  <label className="flex w-full flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
    {label}
    <input
      className="rpb-input"
      type="number"
      min={0}
      step="any"
      value={value}
      onFocus={selectInputOnFocus}
      onChange={(event) => onChange(parseNumberInput(event.target.value))}
    />
  </label>
);

export default function HomePage() {
  const { data: masterData, loading: masterLoading, error: masterError } = useRpbMasterData();
  const customerName = useRpbStore((state) => state.customerName);
  const projectName = useRpbStore((state) => state.projectName);
  const dimensions = useRpbStore((state) => state.dimensions);
  const panelThickness = useRpbStore((state) => state.panelThickness);
  const selectedOther = useRpbStore((state) => state.selectedOther);
  const customOtherItems = useRpbStore((state) => state.customOtherItems);
  const setCustomerName = useRpbStore((state) => state.setCustomerName);
  const setProjectName = useRpbStore((state) => state.setProjectName);
  const setPanelThickness = useRpbStore((state) => state.setPanelThickness);
  const setDimension = useRpbStore((state) => state.setDimension);
  const addOtherQty = useRpbStore((state) => state.addOtherQty);
  const addCustomOtherItem = useRpbStore((state) => state.addCustomOtherItem);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<OtherFilter>("Semua");
  const [modalItem, setModalItem] = useState<OtherItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [customJenis, setCustomJenis] = useState("");
  const [customKeterangan, setCustomKeterangan] = useState("");
  const [customSatuan, setCustomSatuan] = useState("");
  const [customJenisSpec, setCustomJenisSpec] = useState("");
  const [customHargaIdr, setCustomHargaIdr] = useState(0);
  const [customQty, setCustomQty] = useState(1);
  const [profileBreakdownOpen, setProfileBreakdownOpen] = useState(false);
  const [konstruksiBreakdownOpen, setKonstruksiBreakdownOpen] = useState(false);

  const otherItems = useMemo(() => masterData?.otherItems ?? [], [masterData?.otherItems]);
  const filterOptions = useMemo<OtherFilter[]>(() => {
    const categories = Array.from(new Set(otherItems.map((item) => item.category)));
    return ["Semua", ...categories];
  }, [otherItems]);

  const profileIdr = useMemo(
    () => calculateProfileTotalIdr(dimensions, panelThickness, masterData?.profileItems ?? []),
    [dimensions, masterData?.profileItems, panelThickness],
  );

  const profileBreakdown = useMemo(
    () =>
      calculateProfileBreakdown(dimensions, panelThickness, masterData?.profileItems ?? []).filter(
        (item) => item.qty > 0,
      ),
    [dimensions, masterData?.profileItems, panelThickness],
  );

  const konstruksiIdr = useMemo(
    () =>
      calculateKonstruksiTotalIdr(
        dimensions,
        panelThickness,
        masterData?.konstruksiItems ?? [],
      ),
    [dimensions, masterData?.konstruksiItems, panelThickness],
  );

  const konstruksiBreakdown = useMemo(
    () =>
      calculateKonstruksiBreakdown(
        dimensions,
        panelThickness,
        masterData?.konstruksiItems ?? [],
      ).filter((item) => item.qty > 0),
    [dimensions, masterData?.konstruksiItems, panelThickness],
  );

  const filteredOtherItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return otherItems.filter((item) => {
      const sameCategory =
        activeFilter === "Semua" ? true : item.category === activeFilter;

      const text = `${item.name} ${item.model}`.toLowerCase();
      const sameKeyword = keyword.length === 0 ? true : text.includes(keyword);

      return sameCategory && sameKeyword;
    });
  }, [activeFilter, otherItems, search]);

  const selectedOtherCount = useMemo(
    () => {
      const stockQty = Object.values(selectedOther).reduce(
        (sum, qty) => sum + (Number.isFinite(qty) ? qty : 0),
        0,
      );
      const customQtyTotal = customOtherItems.reduce((sum, item) => sum + item.qty, 0);

      return stockQty + customQtyTotal;
    },
    [customOtherItems, selectedOther],
  );

  const openAddModal = (item: OtherItem) => {
    setModalItem(item);
    setModalQty(1);
  };

  const closeAddModal = () => {
    setModalItem(null);
    setModalQty(1);
  };

  const handleAddOther = () => {
    if (!modalItem) {
      return;
    }

    addOtherQty(modalItem.id, modalQty);
    closeAddModal();
  };

  const openCustomModal = () => {
    setCustomModalOpen(true);
    setCustomJenis("");
    setCustomKeterangan("");
    setCustomSatuan("");
    setCustomJenisSpec("");
    setCustomHargaIdr(0);
    setCustomQty(1);
  };

  const closeCustomModal = () => {
    setCustomModalOpen(false);
  };

  const handleAddCustomOther = () => {
    const jenis = customJenis.trim();
    const keterangan = customKeterangan.trim();
    const satuan = customSatuan.trim();
    const jenisSpec = customJenisSpec.trim();

    if (
      !jenis ||
      !keterangan ||
      !satuan ||
      !jenisSpec ||
      customHargaIdr <= 0 ||
      customQty <= 0
    ) {
      window.alert("Lengkapi semua field custom item dengan benar.");
      return;
    }

    addCustomOtherItem({
      jenis,
      keterangan,
      satuan,
      jenisSpec,
      hargaIdr: customHargaIdr,
      qty: customQty,
    });
    closeCustomModal();
  };

  const updateDimension = (key: DimensionKey, value: number) => {
    setDimension(key, value);
  };

  return (
    <RpbPageFrame shellClassName="rpb-compact">
      <div className="space-y-4 py-4 md:space-y-3 md:py-5">
          {masterLoading ? (
            <div className="rpb-section p-4 text-sm text-rpb-ink-soft">
              Memuat master data dari database...
            </div>
          ) : null}
          {masterError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {masterError}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
              Customer Name
              <input
                className="rpb-input"
                placeholder="Masukkan nama customer"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
              Project Name
              <input
                className="rpb-input"
                placeholder="Masukkan nama project"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
              />
            </label>
          </div>

          <div>
            <h2 className="rpb-h-title mb-2 text-base font-semibold md:text-lg">Dimension</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <DimensionInput
                label="Panjang (mm)"
                value={dimensions.length}
                onChange={(value) => updateDimension("length", value)}
              />
              <DimensionInput
                label="Lebar (mm)"
                value={dimensions.width}
                onChange={(value) => updateDimension("width", value)}
              />
              <DimensionInput
                label="Tinggi (mm)"
                value={dimensions.height}
                onChange={(value) => updateDimension("height", value)}
              />
            </div>
          </div>

          <section className="rpb-key-card p-4 md:p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="rpb-h-title text-base font-semibold md:text-lg">Profile</h2>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                onClick={() => setProfileBreakdownOpen((current) => !current)}
                aria-expanded={profileBreakdownOpen}
                aria-controls="profile-breakdown"
              >
                <span>Detail</span>
                {profileBreakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft md:w-64">
                Tebal Panel
                <select
                  className="rpb-input"
                  value={panelThickness}
                  onChange={(event) =>
                    setPanelThickness(Number(event.target.value) as 30 | 45)
                  }
                >
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                </select>
              </label>
              <div className="rpb-price-pill inline-flex w-full items-center justify-between gap-4 px-5 py-3 text-sm font-semibold md:w-auto md:min-w-72">
                <span>Harga Profile</span>
                <span className="text-base">{formatRupiah(profileIdr)}</span>
              </div>
            </div>
            {profileBreakdownOpen ? (
              <div id="profile-breakdown">
                <FixedBreakdownPanel
                  items={profileBreakdown}
                  emptyText="Belum ada item profile yang terhitung."
                  totalLabel="Total Profile"
                  totalValue={profileIdr}
                />
              </div>
            ) : null}
          </section>

          <section className="rpb-key-card p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="rpb-h-title text-base font-semibold md:text-lg">Konstruksi</h2>
              <button
                type="button"
                className="rpb-btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold"
                onClick={() => setKonstruksiBreakdownOpen((current) => !current)}
                aria-expanded={konstruksiBreakdownOpen}
                aria-controls="konstruksi-breakdown"
              >
                <span>Detail</span>
                {konstruksiBreakdownOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="rpb-price-pill inline-flex w-full items-center justify-between gap-4 px-5 py-3 text-sm font-semibold md:ml-auto md:w-auto md:min-w-72">
                <span>Total Konstruksi</span>
                <span className="text-base">{formatRupiah(konstruksiIdr)}</span>
              </div>
            </div>
            {konstruksiBreakdownOpen ? (
              <div id="konstruksi-breakdown">
                <FixedBreakdownPanel
                  items={konstruksiBreakdown}
                  emptyText="Belum ada item konstruksi yang terhitung."
                  totalLabel="Total Konstruksi"
                  totalValue={konstruksiIdr}
                />
              </div>
            ) : null}
          </section>

          <section className="rpb-section p-4 md:p-4">
            <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="rpb-h-title text-base font-semibold md:text-lg">Other</h2>
              <div className="rpb-price-pill inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
                <span>Terpilih</span>
                <span>{selectedOtherCount} unit</span>
              </div>
            </div>
            <div className="mb-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-rpb-ink-soft"
                />
                <input
                  className="rpb-input rpb-input-with-icon"
                  placeholder="Search item or model"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <label>
                <select
                  className="rpb-input pl-3"
                  value={activeFilter}
                  onChange={(event) => setActiveFilter(event.target.value as OtherFilter)}
                >
                  {filterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="max-h-[300px] overflow-y-auto pr-1 md:max-h-[360px]">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  type="button"
                  className="rpb-grid-card rpb-custom-card flex min-h-[130px] flex-col items-center justify-center gap-2 p-3"
                  onClick={openCustomModal}
                  aria-label="Tambah custom item"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-current text-2xl leading-none">
                    +
                  </span>
                  <div className="text-center">
                    <p className="text-sm font-semibold">Tambah Custom Item</p>
                    <p className="text-xs font-medium opacity-80">Klik untuk tambah</p>
                  </div>
                </button>
                {filteredOtherItems.map((item) => {
                  const currentQty = selectedOther[item.id] ?? 0;

                  return (
                    <article key={item.id} className="rpb-grid-card p-2.5">
                      <div className="mb-1.5 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{item.name}</p>
                          <p className="text-xs text-rpb-ink-soft">{item.category}</p>
                        </div>
                        <button
                          type="button"
                          className="rpb-btn-primary inline-flex h-8 w-8 items-center justify-center"
                          onClick={() => openAddModal(item)}
                          aria-label={`Tambah ${item.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="line-clamp-1 text-xs text-rpb-ink-soft">
                        Model: {item.model}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-sm">
                          <span className="font-semibold">
                          {formatRupiah(item.priceIdr)}
                        </span>
                        {currentQty > 0 ? (
                          <span className="rpb-chip px-2 py-0.5 text-xs font-semibold text-rpb-primary">
                            Qty {currentQty}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Link
              href="/summary"
              className="rpb-btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold"
            >
              Next
              <ArrowRight size={16} />
            </Link>
          </div>
      </div>

      {modalItem ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-rpb-border bg-white shadow-xl">
            <div className="rpb-topbar px-5 py-4 text-white">
              <h3 className="rpb-h-title text-lg font-semibold">{modalItem.name}</h3>
            </div>
            <div className="space-y-5 overflow-y-auto p-5">
              <div className="rpb-section p-4">
                <p className="mb-1 text-sm text-rpb-ink-soft">Price</p>
                <p className="text-2xl font-semibold">
                  {formatRupiah(modalItem.priceIdr)}
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold text-rpb-ink-soft">
                  Quantity (unit)
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rpb-btn-ghost h-11 w-11 text-xl"
                    onClick={() => setModalQty((qty) => Math.max(1, qty - 1))}
                  >
                    -
                  </button>
                  <input
                    className="rpb-input text-center"
                    type="number"
                    min={1}
                    step={1}
                    value={modalQty}
                    onFocus={selectInputOnFocus}
                    onChange={(event) =>
                      setModalQty(Math.max(1, Math.floor(parseNumberInput(event.target.value))))
                    }
                  />
                  <button
                    type="button"
                    className="rpb-btn-primary h-11 w-11 text-xl font-semibold"
                    onClick={() => setModalQty((qty) => qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rpb-section p-4">
                <p className="text-sm text-rpb-ink-soft">Total price</p>
                <p className="text-xl font-semibold">
                  {formatRupiah(modalQty * modalItem.priceIdr)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                  onClick={closeAddModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rpb-btn-primary px-4 py-2 text-sm font-semibold"
                  onClick={handleAddOther}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {customModalOpen ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-[#15172b]/45 p-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] backdrop-blur-[2px] md:items-center md:pb-6">
          <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-rpb-border bg-[#e9f4fa] shadow-xl">
            <div className="rpb-topbar px-6 py-4 text-white">
              <h3 className="rpb-h-title text-lg font-semibold">Custom Item</h3>
            </div>
            <div className="space-y-5 overflow-y-auto p-5 md:p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Jenis
                  <input
                    className="rpb-input"
                    value={customJenis}
                    onChange={(event) => setCustomJenis(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Keterangan
                  <input
                    className="rpb-input"
                    value={customKeterangan}
                    onChange={(event) => setCustomKeterangan(event.target.value)}
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Satuan
                  <input
                    className="rpb-input"
                    value={customSatuan}
                    onChange={(event) => setCustomSatuan(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Jenis Spec
                  <input
                    className="rpb-input"
                    value={customJenisSpec}
                    onChange={(event) => setCustomJenisSpec(event.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Harga (Rupiah)
                  <input
                    className="rpb-input"
                    type="number"
                    min={0}
                    step="any"
                    value={customHargaIdr}
                    onFocus={selectInputOnFocus}
                    onChange={(event) => setCustomHargaIdr(parseNumberInput(event.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm font-semibold text-rpb-ink-soft">
                  Quantity
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rpb-btn-ghost h-11 w-11 shrink-0 aspect-square text-xl"
                      onClick={() => setCustomQty((qty) => Math.max(1, qty - 1))}
                      aria-label="Kurangi quantity custom item"
                    >
                      -
                    </button>
                    <input
                      className="rpb-input h-11 w-24 text-center"
                      type="text"
                      inputMode="numeric"
                      value={customQty}
                      onFocus={selectInputOnFocus}
                      onChange={(event) =>
                        setCustomQty(Math.max(1, Math.floor(parseNumberInput(event.target.value))))
                      }
                    />
                    <button
                      type="button"
                      className="rpb-btn-primary h-11 w-11 shrink-0 aspect-square text-xl font-semibold"
                      onClick={() => setCustomQty((qty) => qty + 1)}
                      aria-label="Tambah quantity custom item"
                    >
                      +
                    </button>
                  </div>
                </label>
              </div>

              <div className="grid items-end gap-3 md:grid-cols-[minmax(0,1fr)_290px]">
                <div className="text-xs text-rpb-ink-soft">
                  Quantity custom item bisa diatur sesuai kebutuhan.
                </div>
                <div className="border-t border-rpb-border px-4 py-2">
                  <p className="text-xs text-rpb-ink-soft">Total price</p>
                  <p className="text-lg font-semibold">
                    {formatRupiah(customHargaIdr * customQty)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  className="rpb-btn-ghost px-4 py-2 text-sm font-semibold"
                  onClick={closeCustomModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rpb-btn-primary px-4 py-2 text-sm font-semibold"
                  onClick={handleAddCustomOther}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </RpbPageFrame>
  );
}
