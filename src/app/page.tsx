"use client";

import {
  calculateKonstruksiTotalIdr,
  calculateProfileTotalIdr,
  formatRupiah,
} from "@/lib/rpb-calculator";
import { RpbUserActions } from "@/components/rpb-user-actions";
import { useRpbMasterData } from "@/hooks/use-rpb-master-data";
import { useRpbStore } from "@/store/rpb-store";
import type { DimensionKey, OtherItem, StockCategory } from "@/types/rpb";
import { ArrowRight, Plus, Search } from "lucide-react";
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

  const otherItems = useMemo(() => masterData?.otherItems ?? [], [masterData?.otherItems]);
  const filterOptions = useMemo<OtherFilter[]>(() => {
    const categories = Array.from(new Set(otherItems.map((item) => item.category)));
    return ["Semua", ...categories];
  }, [otherItems]);

  const profileIdr = useMemo(
    () => calculateProfileTotalIdr(dimensions, panelThickness, masterData?.profileItems ?? []),
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
    <div className="mx-auto min-h-screen w-full max-w-6xl p-4 md:px-10 md:py-5 lg:px-12">
      <main className="rpb-shell rpb-compact overflow-hidden">
        <header className="rpb-topbar flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-white md:px-6">
          <h1 className="rpb-h-title text-xl font-semibold md:text-2xl">RPB</h1>
          <RpbUserActions />
        </header>

        <div className="space-y-4 p-5 md:space-y-3 md:px-10 md:py-6 lg:px-12">
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

          <section className="rpb-section p-4 md:p-4">
            <h2 className="rpb-h-title mb-2 text-base font-semibold md:text-lg">Profile</h2>
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
                <span className="text-base">
                  {formatRupiah(profileIdr)}
                </span>
              </div>
            </div>
          </section>

          <section className="rpb-section p-4 md:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <h2 className="rpb-h-title text-base font-semibold md:text-lg">Konstruksi</h2>
              <div className="rpb-price-pill inline-flex w-full items-center justify-between gap-4 px-5 py-3 text-sm font-semibold md:w-auto md:min-w-72">
                <span>Total Konstruksi</span>
                <span className="text-base">
                  {formatRupiah(konstruksiIdr)}
                </span>
              </div>
            </div>
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

            <div className="max-h-[320px] overflow-y-auto pr-1 md:max-h-[360px]">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                <button
                  type="button"
                  className="rpb-grid-card rpb-custom-card flex min-h-[130px] items-center justify-center"
                  onClick={openCustomModal}
                  aria-label="Tambah custom item"
                >
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/45 text-4xl leading-none">
                    +
                  </span>
                </button>
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
      </main>

      {modalItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15172b]/45 p-4 backdrop-blur-[2px]">
          <div className="rpb-shell w-full max-w-xl">
            <div className="rpb-topbar px-5 py-4 text-white">
              <h3 className="rpb-h-title text-lg font-semibold">{modalItem.name}</h3>
            </div>
            <div className="space-y-5 p-5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#15172b]/45 p-4 backdrop-blur-[2px]">
          <div className="rpb-shell w-full max-w-xl">
            <div className="rpb-topbar px-5 py-4 text-white">
              <h3 className="rpb-h-title text-lg font-semibold">Custom Item</h3>
            </div>
            <div className="space-y-4 p-5">
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

              <div className="grid gap-3 md:grid-cols-2">
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
              </div>

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

              <div>
                <p className="mb-2 text-sm font-semibold text-rpb-ink-soft">Quantity</p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rpb-btn-ghost h-11 w-11 text-xl"
                    onClick={() => setCustomQty((qty) => Math.max(1, qty - 1))}
                  >
                    -
                  </button>
                  <input
                    className="rpb-input text-center"
                    type="number"
                    min={1}
                    step={1}
                    value={customQty}
                    onFocus={selectInputOnFocus}
                    onChange={(event) =>
                      setCustomQty(Math.max(1, Math.floor(parseNumberInput(event.target.value))))
                    }
                  />
                  <button
                    type="button"
                    className="rpb-btn-primary h-11 w-11 text-xl font-semibold"
                    onClick={() => setCustomQty((qty) => qty + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="rpb-section p-4">
                <p className="text-sm text-rpb-ink-soft">Total price</p>
                <p className="text-xl font-semibold">
                  {formatRupiah(customHargaIdr * customQty)}
                </p>
              </div>

              <div className="flex justify-end gap-2">
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
    </div>
  );
}
