import { useMemo, useState } from "react";
import { ItemConteo, DetalleConteo } from "@/services/conteoService";

export type ScanProcessResult = {
    handled: boolean;
    info?: string;
    warn?: string;
    error?: string;
};

interface Params {
    detalles: DetalleConteo[];
    onSumarCantidad: (itemId: number, delta: number) => Promise<void>;
    onSelectItem: (itemId: number | null) => void;
    onResetBusquedaManual: () => void;
    onScanApplied?: (
        itemId: number,
        value: number,
        opts?: { mode: "sum" | "replace" }
    ) => void;

}

type ParsedScan = {
    raw: string;
    codigoItem: string;
    lote?: string;
    loteAlt?: string;
    orden?: string;
    unidad?: string;
    cantidad?: string;
};

export const useConteoScan = ({
                                  detalles,
                                  onSumarCantidad,
                                  onSelectItem,
                                  onResetBusquedaManual,
                                  onScanApplied,
                              }: Params) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<ItemConteo[]>([]);
    const [ubicSelected, setUbicSelected] = useState<string | null>(null);
    const [pendingInc, setPendingInc] = useState<number>(1);
    const [pendingKey, setPendingKey] = useState<string>("");

    const norm = (raw: string) => (raw ?? "").replace(/\r?\n/g, "").trim();
    const round4 = (n: number) => Math.round(n * 10000) / 10000;

    const parseCantidadNumber = (rawQty?: string): number | null => {
        const s0 = (rawQty ?? "").trim();
        if (!s0) return null;
        const s = s0.replace(",", ".");
        const n = Number(s);
        if (!Number.isFinite(n)) return null;
        const r = round4(n);
        return r < 0 ? 0 : r;
    };

    const getIncrementoFromScan = (p: ParsedScan): number | null => {
        const byCantidad = parseCantidadNumber(p.cantidad);
        if (byCantidad !== null) return byCantidad;
        const byUnidad = parseCantidadNumber(p.unidad);
        if (byUnidad !== null) return byUnidad;
        return null;
    };

    const parseScan = (raw: string): ParsedScan => {
        const cleaned = norm(raw);
        const compact = cleaned.replace(/\s+/g, "");
        const digitsOnly = compact.replace(/\D/g, "");

        if (digitsOnly.length === 20) {
            const codigoItem = digitsOnly.slice(0, 6);
            const lote = digitsOnly.slice(6, 12);
            const orden = digitsOnly.slice(12, 18);
            const unidad = digitsOnly.slice(18, 20);
            return { raw: cleaned, codigoItem, lote, orden, unidad, cantidad: unidad };
        }

        if (digitsOnly.length >= 20) {
            const codeLen = 7;
            const restLen = digitsOnly.length - codeLen;
            if (restLen > 12) {
                const codigoItem = digitsOnly.slice(0, codeLen);
                const lote = digitsOnly.slice(codeLen, codeLen + 6);
                const orden = digitsOnly.slice(codeLen + 6, codeLen + 12);
                const cantidad = digitsOnly.slice(codeLen + 12);
                return { raw: cleaned, codigoItem, lote, orden, cantidad };
            }
        }

        const mIdx = compact.toLowerCase().indexOf("m");
        if (mIdx > 0) {
            const left = compact.slice(0, mIdx);
            const right = compact.slice(mIdx + 1);
            const itemDigits = left.replace(/\D/g, "");
            const rightDigits = right.replace(/[^\d.]/g, "");

            const loteDigits = rightDigits.slice(0, 6).replace(/\D/g, "");
            const ordenDigits = rightDigits.slice(6, 12).replace(/\D/g, "");
            const cantidad = rightDigits.slice(12);

            const lote = loteDigits ? `m${loteDigits}` : undefined;
            const loteAlt = loteDigits || undefined;

            return {
                raw: cleaned,
                codigoItem: itemDigits || digitsOnly || cleaned,
                lote,
                loteAlt,
                orden: ordenDigits || undefined,
                cantidad: cantidad || undefined,
            };
        }

        if (digitsOnly.length >= 1) {
            return { raw: cleaned, codigoItem: digitsOnly.slice(0, 7) };
        }

        return { raw: cleaned, codigoItem: cleaned };
    };

    const buildPendingKey = (p: ParsedScan) => {
        const code = (p.codigoItem || "").trim();
        if (!code) return "";
        const lote = (p.lote || "").trim();
        const loteAlt = (p.loteAlt || "").trim();
        const loteShow = lote || loteAlt;
        return loteShow ? `${code} · Lote ${loteShow}` : code;
    };

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
                return itLote === lote || itLote === loteAlt || itLote === `m${loteAlt}` || itLote === `m${lote}`;
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

    const resolveByKnownCodes = (raw: string): ParsedScan | null => {
        const cleaned = norm(raw);
        if (!cleaned) return null;

        const compact = cleaned.replace(/\s+/g, "");
        const digits = compact.replace(/\D/g, "");

        let best: string | null = null;
        let mode: "compact" | "digits" = "compact";

        for (const code of knownCodes) {
            if (compact.startsWith(code)) {
                best = code;
                mode = "compact";
                break;
            }
            if (digits.startsWith(code)) {
                best = code;
                mode = "digits";
                break;
            }
        }

        if (!best) return null;

        if (mode === "compact") {
            const rest = compact.slice(best.length);
            const m = rest.match(/(\d+(?:[.,]\d+)?)$/);
            const qty = m?.[1] ?? undefined;

            let lote: string | undefined;
            let orden: string | undefined;
            const digitsRest = digits.slice(best.length);
            if (digitsRest.length >= 12) {
                lote = digitsRest.slice(0, 6);
                orden = digitsRest.slice(6, 12);
            }

            return {
                raw: cleaned,
                codigoItem: best,
                lote,
                orden,
                cantidad: qty ? qty.replace(",", ".") : undefined,
            };
        }

        const restDigits = digits.slice(best.length);
        let lote: string | undefined;
        let orden: string | undefined;
        let cantidad: string | undefined;

        if (restDigits.length >= 12) {
            lote = restDigits.slice(0, 6);
            orden = restDigits.slice(6, 12);
            cantidad = restDigits.slice(12) || undefined;
        } else {
            cantidad = restDigits || undefined;
        }

        return { raw: cleaned, codigoItem: best, lote, orden, cantidad };
    };

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

    const procesarCodigo = async (raw: string, incremento: number): Promise<ScanProcessResult> => {
        const fallbackInc = Number(incremento);
        if (!Number.isFinite(fallbackInc) || fallbackInc <= 0) {
            return { handled: true, warn: "La cantidad a sumar debe ser mayor a 0." };
        }

        if (modalOpen) {
            return { handled: true, warn: "Selecciona la ubicación/fila en pantalla." };
        }

        if (detalles.length === 0) return { handled: true };

        const rawClean = raw.replace(/\s+/g, "");

        let cantidadDetectada: number | null = null;
        let codigoDetectado = rawClean;

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
        if (!code) return { handled: true };

        let matches = buscarMatches(scanned);

        if (matches.length === 0) {
            const alt = resolveByKnownCodes(codigoDetectado);
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
                return { handled: true };
            }

            await onSumarCantidad(item.id, inc);
            return { handled: true };
        }

        if (matches.length > 1) {
            openModal(matches, inc, code);
            return { handled: true, info: "Ítem en varias ubicaciones. Selecciona la ubicación." };
        }

        return { handled: true, warn: `Código ítem no encontrado: ${code}` };
    };

    const filasDeUbicacion = ubicSelected ? groupByUbicacion.map.get(ubicSelected) ?? [] : [];

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
