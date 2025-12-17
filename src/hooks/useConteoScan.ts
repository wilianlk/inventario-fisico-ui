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

export const useConteoScan = ({ detalles, onSumarCantidad, onSelectItem, onResetBusquedaManual }: Params) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<ItemConteo[]>([]);
    const [ubicSelected, setUbicSelected] = useState<string | null>(null);
    const [pendingInc, setPendingInc] = useState<number>(1);
    const [pendingKey, setPendingKey] = useState<string>("");

    const norm = (raw: string) => (raw ?? "").replace(/\r?\n/g, "").trim();

    const parseScan = (raw: string): ParsedScan => {
        const cleaned = norm(raw);

        const digitsOnly = cleaned.replace(/\D/g, "");
        if (digitsOnly.length === 20) {
            const codigoItem = digitsOnly.slice(0, 6);
            const lote = digitsOnly.slice(6, 12);
            const orden = digitsOnly.slice(12, 18);
            const unidad = digitsOnly.slice(18, 20);
            return { raw: cleaned, codigoItem, lote, orden, unidad };
        }

        const compact = cleaned.replace(/\s+/g, "");
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

        if (digitsOnly.length >= 6) {
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
        for (const d of detalles) {
            for (const it of d.items) {
                const itCodigo = (it.codigoItem || "").toString().trim();
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
                if (lote && itLote === lote) return true;
                if (loteAlt && itLote === loteAlt) return true;
                if (loteAlt && itLote === `m${loteAlt}`) return true;
                if (lote && itLote === lote.replace(/^m/i, "")) return true;
                return false;
            });
            if (byLote.length > 0) filtered = byLote;
        }

        if (orden) {
            const byOrden = filtered.filter((it) => {
                const itOrden =
                    (((it as any).ordenPn ?? (it as any).orden ?? (it as any).oc ?? "") as string).toString().trim();
                return itOrden ? itOrden === orden : false;
            });
            if (byOrden.length > 0) filtered = byOrden;
        }

        return filtered;
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
        const scanned = parseScan(raw);
        const code = norm(scanned.codigoItem);
        if (!code) return { handled: true };

        const inc = Number(incremento);
        if (!Number.isFinite(inc) || inc <= 0) return { handled: true, warn: "La cantidad a sumar debe ser mayor a 0." };

        if (modalOpen) {
            return { handled: true, warn: "Selecciona la ubicación/fila en pantalla." };
        }

        if (detalles.length === 0) return { handled: true };

        const matches = buscarMatches(scanned);

        if (matches.length === 1) {
            const item = matches[0];
            onSelectItem(item.id);
            onResetBusquedaManual();
            await onSumarCantidad(item.id, inc);
            return { handled: true };
        }

        if (matches.length > 1) {
            openModal(matches, inc, buildPendingKey(scanned) || code);
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
