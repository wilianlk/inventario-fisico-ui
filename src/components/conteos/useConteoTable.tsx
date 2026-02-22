import { useEffect, useMemo, useRef, useState, KeyboardEvent } from "react";
import { ItemConteo, actualizarNoEncontrado } from "@/services/conteoService";
import { toast } from "react-toastify";

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

interface UseConteoTableStateArgs {
    items: ItemConteo[];
    loading: boolean;
    onUpdateCantidad: (id: number, cantidad: number | null) => Promise<void>;
    conteoId?: number;
    selectedItemId?: number | null;
    searchFilters: SearchFilters;
    editable?: boolean;
    isManaged?: (id: number) => boolean;
    onSetManaged?: (id: number, managed: boolean) => void;
    highlightUnmanaged?: boolean;
    scanApply?: ScanApply;
}

const DEBOUNCE_MS = 200;

export function useConteoTableState({
    items,
    loading,
    onUpdateCantidad,
    conteoId,
    selectedItemId,
    searchFilters,
    editable = true,
    isManaged,
    onSetManaged,
    highlightUnmanaged = false,
    scanApply = null,
}: UseConteoTableStateArgs) {
    const [partsById, setPartsById] = useState<Record<number, Parts>>({});
    const [rowStateById, setRowStateById] = useState<Record<number, RowState>>({});
    const [locked, setLocked] = useState(false);

    const [noEncontradoById, setNoEncontradoById] = useState<Record<number, boolean>>({});

    const lastSavedTotalRef = useRef<Record<number, number | null>>({});
    const totalRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const clearSavedTimersRef = useRef<Record<number, number>>({});
    const dirtyByIdRef = useRef<Record<number, boolean>>({});
    const forcePersistByIdRef = useRef<Record<number, boolean>>({});
    const clearRequestedByIdRef = useRef<Record<number, boolean>>({});
    const debounceTimersRef = useRef<Record<number, number>>({});
    const lastScanApplyAtRef = useRef<Record<number, number>>({});
    const lastToastAtRef = useRef<Record<string, number>>({});

    const partsRef = useRef<Record<number, Parts>>({});

    const baseNoEncontradoMap = useMemo(() => {
        const m: Record<number, boolean> = {};
        for (const it of items) {
            m[it.id] = (it as any).noEncontrado === true;
        }
        return m;
    }, [items]);

    const isNoEncontrado = (id: number) => {
        const v = noEncontradoById[id];
        if (typeof v === "boolean") return v;
        return baseNoEncontradoMap[id] === true;
    };

    const getManaged = (id: number) => {
        if (isNoEncontrado(id)) return true;
        return isManaged ? !!isManaged(id) : true;
    };

    const toastErrorOnce = (message: string) => {
        const msg = String(message || "");
        if (!msg) return;
        const now = Date.now();
        const last = lastToastAtRef.current[msg] || 0;
        if (now - last < 2000) return;
        lastToastAtRef.current[msg] = now;
        toast.error(msg);
    };

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const retryOnce = async <T,>(fn: () => Promise<T>, delayMs = 400): Promise<T> => {
        try {
            return await fn();
        } catch (err) {
            await sleep(delayMs);
            return await fn();
        }
    };

    const normalizeIncoming = (id: number, v: any): number | null => {
        if (v === null || v === undefined) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) return null;
        const managed = getManaged(id);
        if (n === 0 && !managed) return null;
        return n;
    };

    const isSaving = (id: number) => rowStateById[id]?.status === "saving";

    const isMissingConteoId = (item: ItemConteo) => {
        const id = conteoId ?? (item as any).conteoId;
        return !id;
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
                    const created = { unidades: "", paquetes: "", saldos: "", total: base };
                    next[it.id] = created;
                    partsRef.current[it.id] = created;
                    continue;
                }

                if (!dirtyByIdRef.current[it.id]) {
                    const updated = { ...existing, total: base };
                    next[it.id] = updated;
                    partsRef.current[it.id] = updated;
                } else {
                    partsRef.current[it.id] = existing;
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
        (p.unidades || "").trim() !== "" || (p.paquetes || "").trim() !== "" || (p.saldos || "").trim() !== "";

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
        const fromRef = partsRef.current[item.id];
        if (fromRef) return fromRef;

        const p = partsById[item.id];
        if (p) {
            partsRef.current[item.id] = p;
            return p;
        }

        const norm = normalizeIncoming(item.id, (item as any).cantidadContada);
        const base = norm === null ? "" : String(norm);
        const created = { unidades: "", paquetes: "", saldos: "", total: base };
        partsRef.current[item.id] = created;
        return created;
    };

    const setPart = (id: number, next: Parts) => {
        partsRef.current[id] = next;
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
        const data = err?.response?.data;
        const msg =
            (typeof data === "string" && data.trim()) ||
            data?.mensaje ||
            data?.message ||
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
        if ((item as any).noEncontrado === true) return;
        if (isMissingConteoId(item)) return;

        const p = partsRef.current[item.id] ?? getParts(item);
        const total = getTotalDisplay(p);
        const forcePersist = !!forcePersistByIdRef.current[item.id];
        const clearRequested = !!clearRequestedByIdRef.current[item.id];

        const incomingNorm = normalizeIncoming(item.id, (item as any).cantidadContada);
        const last: number | null = lastSavedTotalRef.current[item.id] ?? (incomingNorm ?? null);

        if (total === null) {
            if (!clearRequested) {
                dirtyByIdRef.current[item.id] = false;
                forcePersistByIdRef.current[item.id] = false;
                if (last !== null) {
                    setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: String(last) });
                }
                return;
            }

            if (last === null) {
                dirtyByIdRef.current[item.id] = false;
                forcePersistByIdRef.current[item.id] = false;
                clearRequestedByIdRef.current[item.id] = false;
                return;
            }

            setRowState(item.id, { status: "saving" });

            try {
                await onUpdateCantidad(item.id, null);
                lastSavedTotalRef.current[item.id] = null;
                dirtyByIdRef.current[item.id] = false;
                forcePersistByIdRef.current[item.id] = false;
                clearRequestedByIdRef.current[item.id] = false;
                setRowState(item.id, { status: "saved" });
                markSavedTemporarily(item.id);
            } catch (err) {
                const { status, message } = extractError(err);
                const isLocked = status === 409;
                if (isLocked) setLocked(true);

                setRowState(item.id, { status: "error", message, locked: isLocked });
                toastErrorOnce(message);

                if (!isLocked) {
                    dirtyByIdRef.current[item.id] = true;
                    return;
                }

                dirtyByIdRef.current[item.id] = false;
                forcePersistByIdRef.current[item.id] = false;
                clearRequestedByIdRef.current[item.id] = false;
                onSetManaged?.(item.id, true);
                const base = String(last);
                setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: base });
            }
            return;
        }

        clearRequestedByIdRef.current[item.id] = false;

        if (last !== null && total === last && !forcePersist) {
            dirtyByIdRef.current[item.id] = false;
            return;
        }

        setRowState(item.id, { status: "saving" });

        try {
            await onUpdateCantidad(item.id, total);
            lastSavedTotalRef.current[item.id] = total;
            dirtyByIdRef.current[item.id] = false;
            forcePersistByIdRef.current[item.id] = false;
            setRowState(item.id, { status: "saved" });
            markSavedTemporarily(item.id);
        } catch (err) {
            const { status, message } = extractError(err);
            const isLocked = status === 409;
            if (isLocked) setLocked(true);

            setRowState(item.id, { status: "error", message, locked: isLocked });
            toastErrorOnce(message);

            if (!isLocked) {
                dirtyByIdRef.current[item.id] = true;
                return;
            }

            dirtyByIdRef.current[item.id] = false;
            forcePersistByIdRef.current[item.id] = false;
            const base = last === null ? "" : String(last);
            setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: base });
        }
    };

    const scheduleGuardarDebounced = (item: ItemConteo) => {
        if (locked || !editable) return;
        if ((item as any).noEncontrado === true) return;
        if (isMissingConteoId(item)) return;

        clearDebounce(item.id);

        debounceTimersRef.current[item.id] = window.setTimeout(() => {
            if (locked || !editable) return;
            if ((item as any).noEncontrado === true) return;
            void guardarSiCambia(item);
        }, DEBOUNCE_MS);
    };

    const setManualField = (item: ItemConteo, key: "unidades" | "paquetes" | "saldos", value: string) => {
        if (locked || !editable) return;
        if ((item as any).noEncontrado === true) return;
        if (isMissingConteoId(item)) return;

        dirtyByIdRef.current[item.id] = true;

        const p = getParts(item);
        const next = { ...p, [key]: value };

        if (!anyManualFilled(next)) {
            onSetManaged?.(item.id, false);
            forcePersistByIdRef.current[item.id] = false;
            clearRequestedByIdRef.current[item.id] = true;
            setPart(item.id, { ...next, total: "" });
            scheduleGuardarDebounced(item);
            return;
        }

        onSetManaged?.(item.id, true);
        forcePersistByIdRef.current[item.id] = true;
        clearRequestedByIdRef.current[item.id] = false;
        const totalManual = calcularManual(next);
        setPart(item.id, { ...next, total: String(totalManual) });
        scheduleGuardarDebounced(item);
    };

    const setTotalField = (item: ItemConteo, value: string) => {
        if (locked || !editable) return;
        if ((item as any).noEncontrado === true) return;
        if (isMissingConteoId(item)) return;

        const p = getParts(item);
        if (anyManualFilled(p)) return;

        const lastScanAt = lastScanApplyAtRef.current[item.id] ?? 0;
        if (lastScanAt > 0 && Date.now() - lastScanAt < 1500) return;

        dirtyByIdRef.current[item.id] = true;

        const v = (value || "").trim();
        onSetManaged?.(item.id, v !== "");
        forcePersistByIdRef.current[item.id] = v !== "";
        clearRequestedByIdRef.current[item.id] = v === "";

        setPart(item.id, { ...p, unidades: "", paquetes: "", saldos: "", total: value });
        scheduleGuardarDebounced(item);
    };

    const handleKeyDownTotal = (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => {
        if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    const renderRowState = (rs: RowState | undefined, missingConteo: boolean) => {
        if (missingConteo) {
            return (
                <span className="text-[11px] text-amber-700" title="ConteoId no disponible.">
                    Sin conteo
                </span>
            );
        }
        if (!rs || rs.status === "idle") return null;
        if (rs.status === "saving") return <span className="text-[11px] text-slate-500">Guardando...</span>;
        if (rs.status === "saved") return <span className="text-[11px] text-emerald-600">Guardado</span>;
        return (
            <span className="text-[11px] text-red-600" title={(rs as any)?.message}>
                Error
            </span>
        );
    };

    const toggleNoEncontrado = async (item: ItemConteo, value: boolean) => {
        if (locked || !editable) return;

        const prev = (item as any).noEncontrado === true;

        setNoEncontradoById((p) => ({ ...p, [item.id]: value }));

        if (value) {
            onSetManaged?.(item.id, true);
            dirtyByIdRef.current[item.id] = false;
            forcePersistByIdRef.current[item.id] = false;
            clearRequestedByIdRef.current[item.id] = false;
            clearDebounce(item.id);
            setRowState(item.id, { status: "idle" });
            setPart(item.id, { unidades: "", paquetes: "", saldos: "", total: "0" });
        }

        try {
            const codigoItem = (item as any).codigoItem ?? item.codigoItem;
            const codigo = (codigoItem ?? "").toString().trim();
            const targetConteoId = conteoId ?? (item as any).conteoId;
            if (!targetConteoId) {
                throw new Error("ConteoId no disponible para actualizar No Encontrado.");
            }
            if (!codigo) {
                throw new Error("Código item no disponible para actualizar No Encontrado.");
            }
            await retryOnce(() => actualizarNoEncontrado(targetConteoId, codigo, value));
        } catch (err) {
            const { message } = extractError(err);
            setNoEncontradoById((p) => ({ ...p, [item.id]: prev }));
            toastErrorOnce(message);
        }
    };

    useEffect(() => {
        if (!scanApply) return;
        if (!editable || locked) return;

        const { itemId, value, mode } = scanApply;

        if (isNoEncontrado(itemId)) return;

        const v = Number(value);
        if (!Number.isFinite(v) || v <= 0) return;

        const item = items.find((x) => x.id === itemId);
        if (!item) return;
        if (isMissingConteoId(item)) return;

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
        clearRequestedByIdRef.current[itemId] = false;

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
                toastErrorOnce(message);
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
        return items
            .filter((i) => {
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
            })
            .map((i) => {
                const v = noEncontradoById[i.id];
                const eff = typeof v === "boolean" ? v : (i as any).noEncontrado === true;
                return { ...(i as any), noEncontrado: eff } as ItemConteo;
            });
    }, [items, fEtiqueta, fCodigo, fDesc, fLote, fUbiSearch, noEncontradoById]);

    const warnActive = highlightUnmanaged === true;

    return {
        loading,
        editable,
        locked,
        warnActive,
        rowStateById,
        filtrados,
        getManaged,
        getParts,
        anyManualFilled,
        getTotalDisplay,
        setManualField,
        setTotalField,
        handleKeyDownTotal,
        guardarSiCambia,
        setTotalRef: (id: number, el: HTMLInputElement | null) => {
            totalRefs.current[id] = el;
        },
        renderRowState,
        toggleNoEncontrado,
        isSaving,
        isMissingConteoId,
    };
}
