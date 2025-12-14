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

export const useConteoScan = ({
                                  detalles,
                                  onSumarCantidad,
                                  onSelectItem,
                                  onResetBusquedaManual,
                              }: Params) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [candidates, setCandidates] = useState<ItemConteo[]>([]);
    const [ubicSelected, setUbicSelected] = useState<string | null>(null);
    const [pendingInc, setPendingInc] = useState<number>(1);
    const [pendingKey, setPendingKey] = useState<string>("");

    const norm = (raw: string) => raw.replace(/\r?\n/g, "").trim();

    const buscarPorCodigo = (codigo: string) => {
        const code = codigo.trim();
        const matches: ItemConteo[] = [];
        for (let d = 0; d < detalles.length; d++) {
            for (let i = 0; i < detalles[d].items.length; i++) {
                const it = detalles[d].items[i];
                if (it.codigoItem.trim() === code) matches.push(it);
            }
        }
        return matches;
    };

    const groupByUbicacion = useMemo(() => {
        const map = new Map<string, ItemConteo[]>();
        for (const it of candidates) {
            const ub = it.ubicacion.trim();
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
        setCandidates(items);
        setPendingInc(inc);
        setPendingKey(key);
        setUbicSelected(null);
        setModalOpen(true);
        onSelectItem(null);
    };

    const aplicarConteoEnItem = async (itemId: number) => {
        const item = candidates.find((x) => x.id === itemId) ?? null;
        if (!item) return;

        // Esto es lo que hace focus/scroll en la tabla (vía ConteoTable effect)
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
        // Si hay varias filas: NO hacemos nada más.
        // El usuario elige la fila y ahí se hace focus/guardado.
    };

    const procesarCodigo = async (raw: string, incremento: number): Promise<ScanProcessResult> => {
        const code = norm(raw);
        if (!code) return { handled: true };

        const inc = Number(incremento);
        if (!Number.isFinite(inc) || inc <= 0) {
            return { handled: true, warn: "La cantidad a sumar debe ser mayor a 0." };
        }

        // El escáner es SOLO código ítem.
        if (modalOpen) {
            return { handled: true, warn: "Selecciona la ubicación/fila en pantalla (el escáner es solo Código ítem)." };
        }

        if (detalles.length === 0) return { handled: true };

        const porCodigo = buscarPorCodigo(code);

        if (porCodigo.length === 1) {
            const item = porCodigo[0];
            onSelectItem(item.id);
            onResetBusquedaManual();
            await onSumarCantidad(item.id, inc);
            return { handled: true };
        }

        if (porCodigo.length > 1) {
            openModal(porCodigo, inc, code);
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
