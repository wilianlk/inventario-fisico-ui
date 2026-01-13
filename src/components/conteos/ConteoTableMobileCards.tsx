import { KeyboardEvent } from "react";
import { ItemConteo } from "@/services/conteoService";
import { Input } from "@/components/ui/input";

type Parts = {
    unidades: string;
    paquetes: string;
    saldos: string;
    total: string;
};

type RowState =
    | { status: "idle" }
    | { status: "saving" }
    | { status: "saved" }
    | { status: "error"; message: string; locked?: boolean };

interface Props {
    items: ItemConteo[];
    selectedItemId: number | null;

    warnActive: boolean;
    getManaged: (id: number) => boolean;

    getParts: (item: ItemConteo) => Parts;
    anyManualFilled: (p: Parts) => boolean;
    getTotalDisplay: (p: Parts) => number | null;

    rowStateById: Record<number, RowState>;
    locked: boolean;
    editable: boolean;

    setManualField: (item: ItemConteo, key: "unidades" | "paquetes" | "saldos", value: string) => void;
    setTotalField: (item: ItemConteo, value: string) => void;

    handleKeyDownTotal: (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => void;
    onBlurTotal: (item: ItemConteo) => void;

    setTotalRef: (id: number, el: HTMLInputElement | null) => void;
    renderRowState: (rs: RowState | undefined) => React.ReactNode;

    onToggleNoEncontrado: (item: ItemConteo, value: boolean) => void;
}

export default function ConteoTableMobileCards({
                                                   items,
                                                   selectedItemId,
                                                   warnActive,
                                                   getManaged,
                                                   getParts,
                                                   anyManualFilled,
                                                   getTotalDisplay,
                                                   rowStateById,
                                                   locked,
                                                   editable,
                                                   setManualField,
                                                   setTotalField,
                                                   handleKeyDownTotal,
                                                   onBlurTotal,
                                                   setTotalRef,
                                                   renderRowState,
                                                   onToggleNoEncontrado,
                                               }: Props) {
    return (
        <div className="md:hidden space-y-3 pb-24">
            {items.map((item) => {
                const p = getParts(item);
                const totalDisplay = getTotalDisplay(p);
                const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                const rs = rowStateById[item.id];

                const noEncontrado = (item as any).noEncontrado === true;
                const disabled = locked || !editable || noEncontrado;

                const managed = getManaged(item.id);
                const paint = warnActive && !managed;

                const cardBase = "rounded-xl border bg-white p-3 shadow-sm transition-colors";
                const cardWarn = paint ? "border-red-400 bg-red-50/30" : "border-slate-200";
                const cardSelected = selectedItemId === item.id ? "ring-2 ring-blue-200" : "";

                return (
                    <div
                        id={`row-${item.id}`}
                        data-item-id={item.id}
                        key={item.id}
                        className={`${cardBase} ${cardWarn} ${cardSelected}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-xs font-semibold text-slate-900 truncate">
                                    {etiqueta ? `${etiqueta} · ` : ""}
                                    <span className="font-mono">{(item.codigoItem || "").trim()}</span>
                                </div>

                                <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">{item.descripcion}</div>

                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                                    <div>
                                        <div className="text-slate-500">Ubicación</div>
                                        <div className="font-mono truncate">{(item.ubicacion || "").trim()}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Lote</div>
                                        <div className="font-mono truncate">{item.lote ? item.lote.trim() : ""}</div>
                                    </div>
                                    <div>
                                        <div className="text-slate-500">Udm</div>
                                        <div className="truncate">{item.udm}</div>
                                    </div>
                                    <div className="text-right">{renderRowState(rs)}</div>
                                </div>

                                <div className="mt-3">
                                    <label className="inline-flex items-center gap-2 select-none text-[11px] text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={noEncontrado}
                                            onChange={(e) => onToggleNoEncontrado(item, e.target.checked)}
                                            disabled={locked || !editable}
                                        />
                                        <span>No está en la ubicación</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3">
                            <div className="text-[11px] text-slate-500 mb-1">Contada</div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="h-9 w-24 text-xs"
                                    placeholder="Unid"
                                    value={p.unidades}
                                    onChange={(e) => setManualField(item, "unidades", e.target.value)}
                                    disabled={disabled}
                                />
                                <div className="text-xs text-slate-500 font-mono">x</div>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="h-9 w-24 text-xs"
                                    placeholder="Paq"
                                    value={p.paquetes}
                                    onChange={(e) => setManualField(item, "paquetes", e.target.value)}
                                    disabled={disabled}
                                />
                                <div className="text-xs text-slate-500 font-mono">+</div>
                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="h-9 w-24 text-xs"
                                    placeholder="Saldos"
                                    value={p.saldos}
                                    onChange={(e) => setManualField(item, "saldos", e.target.value)}
                                    disabled={disabled}
                                />
                                <div className="text-xs text-slate-500 font-mono">=</div>

                                <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    className="h-9 w-28 text-xs font-mono"
                                    placeholder="Total"
                                    value={anyManualFilled(p) ? (totalDisplay === null ? "" : String(totalDisplay)) : p.total}
                                    onChange={(e) => setTotalField(item, e.target.value)}
                                    onKeyDown={(e) => handleKeyDownTotal(e, item)}
                                    onBlur={() => onBlurTotal(item)}
                                    disabled={disabled}
                                    ref={(el) => setTotalRef(item.id, el)}
                                />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
