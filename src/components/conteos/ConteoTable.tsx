import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { ItemConteo } from "@/services/conteoService";
import { toast } from "react-toastify";

import ConteoTableMobileCards from "@/components/conteos/ConteoTableMobileCards";
import ConteoTableDesktopTable from "@/components/conteos/ConteoTableDesktopTable";

export interface SearchFilters {
    etiqueta: string;
    codigoItem: string;
    descripcion: string;
    lote: string;
    ubicacion: string;
}

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

export type ScanApply =
    | {
    itemId: number;
    value: number;
    mode: "sum" | "replace";
    nonce: number;
}
    | null;

interface Props {
    items: ItemConteo[];
    loading: boolean;
    onUpdateCantidad: (id: number, cantidad: number) => Promise<void>;
    selectedItemId?: number | null;
    searchFilters: SearchFilters;
    editable?: boolean;

    isManaged?: (id: number) => boolean;
    onSetManaged?: (id: number, managed: boolean) => void;

    highlightUnmanaged?: boolean;

    scanApply?: ScanApply;
}

const DEBOUNCE_MS = 650;

const ConteoTable = ({
                         items,
                         loading,
                         onUpdateCantidad,
                         selectedItemId,
                         searchFilters,
                         editable = true,
                         isManaged,
                         onSetManaged,
                         highlightUnmanaged = false,
                         scanApply = null,
                     }: Props) => {
    const [partsById, setPartsById] = useState<Record<number, Parts>>({});
    const [rowStateById, setRowStateById] = useState<Record<number, RowState>>({});
    const [locked, setLocked] = useState(false);

    const lastSavedTotalRef = useRef<Record<number, number | null>>({});
    const totalRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const clearSavedTimersRef = useRef<Record<number, number>>({});
    const dirtyByIdRef = useRef<Record<number, boolean>>({});
    const debounceTimersRef = useRef<Record<number, number>>({});
    const lastScanApplyAtRef = useRef<Record<number, number>>({});

    const getManaged = (id: number) => (isManaged ? !!isManaged(id) : true);

    const normalizeIncoming = (id: number, v: any): number | null => {
        if (v === null || v === undefined) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        const managed = getManaged(id);
        if (n === 0 && !managed) return null;
        return n;
    };

    useEffect(() => {
        if (!editable) {
            setLocked(true);
            return;
        }
        setLocked(false);
    }, [editable]);

    useEffect(() => {
        if (!selectedItemId) return;
        const row = document.getElementById(`row-${selectedItemId}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        const el = totalRefs.current[selectedItemId];
        el?.focus();
        el?.select();
    }, [selectedItemId]);

    useEffect(() => {
        const map: Record<number, number | null> = {};
        for (const it of items) map[it.id] = normalizeIncoming(it.id, (it as any).cantidadContada);
        lastSavedTotalRef.current = { ...lastSavedTotalRef.current, ...map };

        setPartsById((prev) => {
            const next = { ...prev };
            for (const it of items) {
                const norm = normalizeIncoming(it.id, (it as any).cantidadContada);
                const base = norm === null ? "" : String(norm);

                const existing = next[it.id];
                if (!existing) {
                    next[it.id] = { unidades: "", paquetes: "", saldos: "", total: base };
                    continue;
                }

                if (!dirtyByIdRef.current[it.id]) {
                    next[it.id] = { ...existing, total: base };
                }
            }
            return next;
        });
    }, [items]);

    useEffect(() => {
        return () => {
            for (const k of Object.keys(clearSavedTimersRef.current)) {
                window.clearTimeout(clearSavedTimersRef.current[Number(k)]);
            }
            for (const k of Object.keys(debounceTimersRef.current)) {
                window.clearTimeout(debounceTimersRef.current[Number(k)]);
            }
        };
    }, []);

    const toNum = (v: string) => {
        if (v === "" || v === null || v === undefined) return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const clamp0 = (n: number) => (n < 0 ? 0 : n);

    const anyManualFilled = (p: Parts) =>
        (p.unidades || "").trim() !== "" ||
        (p.paquetes || "").trim() !== "" ||
        (p.saldos || "").trim() !== "";

    const calcularManual = (p: Parts) => {
        const uStr = (p.unidades || "").trim();
        const paqStr = (p.paquetes || "").trim();
        const sStr = (p.saldos || "").trim();

        const u = clamp0(toNum(uStr));
        const s = clamp0(toNum(sStr));

        if (!paqStr && !sStr) return u;

        const paq = clamp0(toNum(paqStr));
        return clamp0(u * paq + s);
    };

    const getTotalDisplay = (p: Parts): number | null => {
        if (anyManualFilled(p)) return calcularManual(p);

        const t = (p.total || "").trim();
        if (t === "") return null;
        return clamp0(toNum(t));
    };

    const getParts = (item: ItemConteo): Parts => {
        const p = partsById[item.id];
        if (p) return p;

        const norm = normalizeIncoming(item.id, (item as any).cantidadContada);
        const base = norm === null ? "" : String(norm);
        return { unidades: "", paquetes: "", saldos: "", total: base };
    };

    const setPart = (id: number, next: Parts) => {
        setPartsById((prev) => ({ ...prev, [id]: next }));
    };

    const setRowState = (id: number, state: RowState) => {
        setRowStateById((prev) => ({ ...prev, [id]: state }));
    };

    const markSavedTemporarily = (id: number) => {
        if (clearSavedTimersRef.current[id]) {
            window.clearTimeout(clearSavedTimersRef.current[id]);
        }
        clearSavedTimersRef.current[id] = window.setTimeout(() => {
            setRowState(id, { status: "idle" });
        }, 1200);
    };

    const extractError = (err: any): { status?: number; message: string } => {
        const status = err?.response?.status;
        const msg =
            err?.response?.data?.mensaje ||
            err?.response?.data?.message ||
            err?.message ||
            "Error al guardar.";
        return { status, message: String(msg) };
    };

    const clearDebounce = (id: number) => {
        const t = debounceTimersRef.current[id];
        if (t) {
            window.clearTimeout(t);
            debounceTimersRef.current[id] = 0 as any;
        }
    };

    const guardarSiCambia = async (item: ItemConteo) => {
        if (locked || !editable) return;

        const p = getParts(item);
        const total = getTotalDisplay(p);

        const incomingNorm = normalizeIncoming(item.id, (item as any).cantidadContada);
        const last: number | null = lastSavedTotalRef.current[item.id] ?? (incomingNorm ?? null);

        if (total === null) {
            dirtyByIdRef.current[item.id] = false;
            if (last !== null) {
                setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: String(last) });
            }
            return;
        }

        if (last !== null && total === last) {
            dirtyByIdRef.current[item.id] = false;
            return;
        }

        setRowState(item.id, { status: "saving" });

        try {
            await onUpdateCantidad(item.id, total);
            lastSavedTotalRef.current[item.id] = total;
            dirtyByIdRef.current[item.id] = false;
            setRowState(item.id, { status: "saved" });
            markSavedTemporarily(item.id);
        } catch (err) {
            const { status, message } = extractError(err);
            const isLocked = status === 409;
            if (isLocked) setLocked(true);

            setRowState(item.id, { status: "error", message, locked: isLocked });
            toast.error(message);

            if (!isLocked) {
                dirtyByIdRef.current[item.id] = true;
                return;
            }

            dirtyByIdRef.current[item.id] = false;
            const base = last === null ? "" : String(last);
            setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: base });
        }
    };

    const scheduleGuardarDebounced = (item: ItemConteo) => {
        if (locked || !editable) return;
        clearDebounce(item.id);

        debounceTimersRef.current[item.id] = window.setTimeout(() => {
            if (locked || !editable) return;
            void guardarSiCambia(item);
        }, DEBOUNCE_MS);
    };

    const setManualField = (item: ItemConteo, key: "unidades" | "paquetes" | "saldos", value: string) => {
        if (locked || !editable) return;
        dirtyByIdRef.current[item.id] = true;

        const p = getParts(item);
        const next = { ...p, [key]: value };

        if (!anyManualFilled(next)) {
            onSetManaged?.(item.id, false);
            setPart(item.id, { ...next, total: "" });
            scheduleGuardarDebounced(item);
            return;
        }

        onSetManaged?.(item.id, true);
        const totalManual = calcularManual(next);
        setPart(item.id, { ...next, total: String(totalManual) });
        scheduleGuardarDebounced(item);
    };

    const setTotalField = (item: ItemConteo, value: string) => {
        if (locked || !editable) return;

        const p = getParts(item);
        if (anyManualFilled(p)) return;

        const lastScanAt = lastScanApplyAtRef.current[item.id] ?? 0;
        if (lastScanAt > 0 && Date.now() - lastScanAt < 1500) return;

        dirtyByIdRef.current[item.id] = true;

        const v = (value || "").trim();
        onSetManaged?.(item.id, v !== "");

        setPart(item.id, { ...p, unidades: "", paquetes: "", saldos: "", total: value });
        scheduleGuardarDebounced(item);
    };

    const handleKeyDownTotal = (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => {
        if (e.key === "Enter") {
            e.preventDefault();
            clearDebounce(item.id);
            void guardarSiCambia(item);
        }
    };

    const renderRowState = (rs: RowState | undefined) => {
        if (!rs || rs.status === "idle") return null;
        if (rs.status === "saving") return <span className="text-[11px] text-slate-500">Guardando...</span>;
        if (rs.status === "saved") return <span className="text-[11px] text-emerald-600">Guardado</span>;
        return (
            <span className="text-[11px] text-red-600" title={(rs as any)?.message}>
                Error
            </span>
        );
    };

    useEffect(() => {
        if (!scanApply) return;
        if (!editable || locked) return;

        const { itemId, value, mode } = scanApply;

        const v = Number(value);
        if (!Number.isFinite(v) || v <= 0) return;

        const item = items.find((x) => x.id === itemId);
        if (!item) return;

        lastScanApplyAtRef.current[itemId] = Date.now();
        dirtyByIdRef.current[itemId] = true;

        const p = getParts(item);

        const prevU = clamp0(toNum((p.unidades || "").trim()));
        const nextU = mode === "replace" ? clamp0(v) : clamp0(prevU + v);

        const next: Parts = {
            unidades: String(nextU),
            paquetes: p.paquetes,
            saldos: p.saldos,
            total: p.total,
        };

        onSetManaged?.(itemId, true);

        const totalManual = calcularManual(next);

        setPart(itemId, { ...next, total: String(totalManual) });

        clearDebounce(itemId);

        setRowState(itemId, { status: "saving" });

        (async () => {
            try {
                await onUpdateCantidad(itemId, totalManual);
                lastSavedTotalRef.current[itemId] = totalManual;
                dirtyByIdRef.current[itemId] = false;
                setRowState(itemId, { status: "saved" });
                markSavedTemporarily(itemId);
            } catch (err) {
                const { status, message } = extractError(err);
                const isLocked = status === 409;
                if (isLocked) setLocked(true);

                setRowState(itemId, { status: "error", message, locked: isLocked });
                toast.error(message);
                dirtyByIdRef.current[itemId] = true;
            }
        })();
    }, [scanApply?.nonce]);

    const fEtiqueta = (searchFilters.etiqueta || "").trim().toLowerCase();
    const fCodigo = (searchFilters.codigoItem || "").trim().toLowerCase();
    const fDesc = (searchFilters.descripcion || "").trim().toLowerCase();
    const fLote = (searchFilters.lote || "").trim().toLowerCase();
    const fUbiSearch = (searchFilters.ubicacion || "").trim().toLowerCase();

    const filtrados = useMemo(() => {
        return items.filter((i) => {
            const etiqueta = (((i as any).etiqueta ?? "") as string).toString().trim().toLowerCase();
            const codigo = (i.codigoItem || "").trim().toLowerCase();
            const desc = (i.descripcion || "").toLowerCase();
            const lote = (i.lote || "").trim().toLowerCase();
            const ubic = (i.ubicacion || "").trim().toLowerCase();

            if (fEtiqueta && !etiqueta.includes(fEtiqueta)) return false;
            if (fCodigo && !codigo.includes(fCodigo)) return false;
            if (fDesc && !desc.includes(fDesc)) return false;
            if (fLote && !lote.includes(fLote)) return false;
            if (fUbiSearch && !ubic.includes(fUbiSearch)) return false;

            return true;
        });
    }, [items, fEtiqueta, fCodigo, fDesc, fLote, fUbiSearch]);

    if (loading) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                Cargando ítems...
            </div>
        );
    }

    if (!filtrados || filtrados.length === 0) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                No hay ítems para mostrar.
            </div>
        );
    }

    const warnActive = highlightUnmanaged === true;

    return (
        <div className="w-full rounded-xl border bg-white p-3 sm:p-4 shadow-sm">
            {!editable ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Conteo cerrado. Solo lectura.
                </div>
            ) : locked ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Edición bloqueada.
                </div>
            ) : null}

            <ConteoTableMobileCards
                items={filtrados}
                selectedItemId={selectedItemId ?? null}
                warnActive={warnActive}
                getManaged={getManaged}
                getParts={getParts}
                anyManualFilled={anyManualFilled}
                getTotalDisplay={getTotalDisplay}
                rowStateById={rowStateById}
                locked={locked}
                editable={editable}
                setManualField={setManualField}
                setTotalField={setTotalField}
                handleKeyDownTotal={handleKeyDownTotal}
                onBlurTotal={guardarSiCambia}
                setTotalRef={(id, el) => {
                    totalRefs.current[id] = el;
                }}
                renderRowState={renderRowState}
            />

            <ConteoTableDesktopTable
                items={filtrados}
                selectedItemId={selectedItemId ?? null}
                warnActive={warnActive}
                getManaged={getManaged}
                getParts={getParts}
                anyManualFilled={anyManualFilled}
                getTotalDisplay={getTotalDisplay}
                rowStateById={rowStateById}
                locked={locked}
                editable={editable}
                setManualField={setManualField}
                setTotalField={setTotalField}
                handleKeyDownTotal={handleKeyDownTotal}
                onBlurTotal={guardarSiCambia}
                setTotalRef={(id, el) => {
                    totalRefs.current[id] = el;
                }}
                renderRowState={renderRowState}
            />
        </div>
    );
};

export default ConteoTable;
