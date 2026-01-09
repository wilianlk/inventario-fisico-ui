import { useMemo, useState } from "react";
import type { ItemConteo } from "@/services/conteoService";

import type {
    UseConteoScanParams,
    ScanProcessResult,
    ParsedScan,
} from "./conteos/useConteoScan.types";

import {
    norm,
    parseScan,
    buildPendingKey,
    resolveByKnownCodes,
} from "./conteos/useConteoScan.utils";

export const useConteoScan = ({
                                  detalles,
                                  onSumarCantidad,
                                  onSelectItem,
                                  onResetBusquedaManual,
                                  onScanApplied,
                              }: UseConteoScanParams) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<ItemConteo[]>([]);
    const [ubicSelected, setUbicSelected] = useState<string | null>(null);
    const [pendingInc, setPendingInc] = useState<number>(1);
    const [pendingKey, setPendingKey] = useState<string>("");

    const buscarMatches = (p: ParsedScan) => {
        const code = (p.codigoItem || "").trim();
        if (!code) return [];

        const matches: ItemConteo[] = [];
        for (const det of detalles) {
            for (const it of det.items) {
                const itCodigo = ((it.codigoItem ?? "") as string).toString().trim();
                const itProd = (((it as any).prod ?? "") as string).toString().trim();
                if (itCodigo === code || itProd === code) matches.push(it);
            }
        }

        const lote = (p.lote || "").trim();
        const loteAlt = (p.loteAlt || "").trim();
        const orden = (p.orden || "").trim();

        let filtered = matches;

        if (lote || loteAlt) {
            const byLote = filtered.filter((it) => {
                const itLote = (it.lote || "").toString().trim();
                if (!itLote) return false;
                return (
                    itLote === lote ||
                    itLote === loteAlt ||
                    itLote === `m${loteAlt}` ||
                    itLote === `m${lote}`
                );
            });
            if (byLote.length > 0) filtered = byLote;
        }

        if (orden) {
            const byOrden = filtered.filter((it) => {
                const itOrden = (((it as any).ordenPn ?? (it as any).orden ?? (it as any).oc ?? "") as string)
                    .toString()
                    .trim();
                return itOrden ? itOrden === orden : false;
            });
            if (byOrden.length > 0) filtered = byOrden;
        }

        return filtered;
    };

    const allItems = useMemo(() => {
        const list: ItemConteo[] = [];
        for (const d of detalles) for (const it of d.items) list.push(it);
        return list;
    }, [detalles]);

    const knownCodes = useMemo(() => {
        const set = new Set<string>();
        for (const it of allItems) {
            const c = ((it.codigoItem ?? "") as string).toString().trim();
            if (c) set.add(c);
            const p = (((it as any).prod ?? "") as string).toString().trim();
            if (p) set.add(p);
        }
        return Array.from(set).sort((a, b) => b.length - a.length);
    }, [allItems]);

    const groupByUbicacion = useMemo(() => {
        const map = new Map<string, ItemConteo[]>();
        for (const it of candidates) {
            const ub = (it.ubicacion || "").toString().trim();
            if (!map.has(ub)) map.set(ub, []);
            map.get(ub)!.push(it);
        }
        const ubicaciones = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
        const ubicCounts: Record<string, number> = {};
        for (const ub of ubicaciones) ubicCounts[ub] = map.get(ub)?.length ?? 0;
        return { map, ubicaciones, ubicCounts };
    }, [candidates]);

    const closeModal = () => {
        setModalOpen(false);
        setCandidates([]);
        setUbicSelected(null);
        setPendingInc(1);
        setPendingKey("");
    };

    const openModal = (items: ItemConteo[], inc: number, key: string) => {
        onSelectItem(null);
        setUbicSelected(null);
        setCandidates(items);
        setPendingInc(inc);
        setPendingKey(key);
        setModalOpen(true);
    };

    const aplicarConteoEnItem = async (itemId: number) => {
        const item = candidates.find((x) => x.id === itemId) ?? null;
        if (!item) return;

        onSelectItem(item.id);
        onResetBusquedaManual();

        if (onScanApplied) {
            onScanApplied(item.id, pendingInc);
            closeModal();
            return;
        }

        await onSumarCantidad(item.id, pendingInc);
        closeModal();
    };

    const selectUbicacion = async (ubicacion: string) => {
        const ub = ubicacion.trim();
        setUbicSelected(ub);

        const rows = groupByUbicacion.map.get(ub) ?? [];
        if (rows.length === 1) {
            await aplicarConteoEnItem(rows[0].id);
        }
    };

    const procesarCodigo = async (
        raw: string,
        incremento: number
    ): Promise<ScanProcessResult> => {
        const fallbackInc = Number(incremento);
        if (!Number.isFinite(fallbackInc) || fallbackInc <= 0) {
            return { handled: true, applied: false, warn: "La cantidad a sumar debe ser mayor a 0." };
        }

        if (modalOpen) {
            return { handled: true, applied: false, warn: "Selecciona la ubicación/fila en pantalla." };
        }

        if (detalles.length === 0) return { handled: true, applied: false };

        const rawClean = raw.replace(/\s+/g, "");

        let cantidadDetectada: number | null = null;
        let codigoDetectado = rawClean;

        // tu lógica actual de "und estiba" (se conserva tal cual)
        if (rawClean.length >= 19) {
            const codProd = rawClean.slice(0, 7);
            const undEstibaStr = rawClean.slice(19);

            const undEstibaNum = Number(undEstibaStr);
            if (Number.isFinite(undEstibaNum) && undEstibaNum > 0) {
                codigoDetectado = codProd;
                cantidadDetectada = undEstibaNum;
            }
        }

        let scanned = parseScan(codigoDetectado);
        let code = norm(scanned.codigoItem);
        if (!code) return { handled: true, applied: false };

        let matches = buscarMatches(scanned);

        if (matches.length === 0) {
            const alt = resolveByKnownCodes(codigoDetectado, knownCodes);
            if (alt) {
                scanned = alt;
                code = norm(scanned.codigoItem);
                matches = buscarMatches(scanned);
            }
        }

        const inc = cantidadDetectada ?? fallbackInc;
        const hasEmbeddedQty = cantidadDetectada !== null;

        if (matches.length === 1) {
            const item = matches[0];
            onSelectItem(item.id);
            onResetBusquedaManual();

            if (hasEmbeddedQty && onScanApplied) {
                onScanApplied(item.id, inc, { mode: "replace" });
                return { handled: true, applied: true };
            }

            await onSumarCantidad(item.id, inc);
            return { handled: true, applied: true };
        }

        if (matches.length > 1) {
            openModal(matches, inc, buildPendingKey(scanned) || code);
            return {
                handled: true,
                applied: false,
                info: "Ítem en varias ubicaciones. Selecciona la ubicación.",
            };
        }

        return { handled: true, applied: false, warn: `Código ítem no encontrado: ${code}` };
    };

    const filasDeUbicacion = ubicSelected
        ? groupByUbicacion.map.get(ubicSelected) ?? []
        : [];

    return {
        modalOpen,
        closeModal,
        pendingKey,
        ubicSelected,
        setUbicSelected,
        ubicaciones: groupByUbicacion.ubicaciones,
        ubicCounts: groupByUbicacion.ubicCounts,
        filasDeUbicacion,
        selectUbicacion,
        aplicarConteoEnItem,
        procesarCodigo,
    };
};
