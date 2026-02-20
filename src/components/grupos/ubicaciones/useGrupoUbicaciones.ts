import { useEffect, useMemo, useState } from "react";
import type { GrupoConteo } from "@/services/grupoConteoService";
import {
    eliminarFiltro,
    obtenerItemsPorGrupo,
    type FiltroGrupoUbicacion,
    type ItemPhystag,
} from "@/services/grupoUbicacionService";
import { toast } from "react-toastify";

export type DupMode = "" | "UI" | "UIL";

interface UseGrupoUbicacionesOptions {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export function useGrupoUbicaciones({ open, grupo, onClose }: UseGrupoUbicacionesOptions) {
    const [items, setItems] = useState<ItemPhystag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agregarUbicacionesOpen, setAgregarUbicacionesOpen] = useState(false);
    const [agregarItemsOpen, setAgregarItemsOpen] = useState(false);

    const [fUbic, setFUbic] = useState("");
    const [fItem, setFItem] = useState("");
    const [fLote, setFLote] = useState("");
    const [dupMode, setDupMode] = useState<DupMode>("");

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    const mostrarLado = useMemo(
        () => items.some((it: any) => N(it?.bodega) === "13M"),
        [items]
    );

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);

        try {
            const res = await obtenerItemsPorGrupo(grupo.id);
            const data = (res as any)?.data ?? [];
            setItems(Array.isArray(data) ? data : []);
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al cargar items del grupo.");
            setError(msg);
            toast.error(msg);
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && grupo) load();
    }, [open, grupo?.id]);

    const parseUbicacionAComponentes = (bodega: string, ubicacion: string) => {
        const b = N(bodega);
        const u = N(ubicacion);

        if (b === "11" && u.length >= 4) {
            return { rack: u.slice(0, 1), lado: "", altura: u.slice(1, 2), ubicacion: u.slice(2, 4) };
        }
        if (b === "13M" && u.length >= 6) {
            return { rack: u.slice(0, 2), lado: u.slice(2, 3), altura: u.slice(3, 4), ubicacion: u.slice(4, 6) };
        }
        return null;
    };

    const buildPartesDesdeItem = (it: any) => {
        const rack = (it?.rackPasillo ?? it?.rack ?? "").toString().trim();
        const lado = (it?.lado ?? "").toString().trim();
        const altura = (it?.altura ?? "").toString().trim();
        const ubicacion = (it?.posicion ?? "").toString().trim();

        if (rack || lado || altura || ubicacion) {
            return {
                rack: N(rack),
                lado: N(lado),
                altura: altura,
                ubicacion: ubicacion,
            };
        }

        return null;
    };

    const handleQuitarUbicacion = async (item: any) => {
        if (!grupo) return;

        const bodega = N(item?.bodega ?? "");
        const ubicacionFinal = (item?.ubicacion ?? "").toString().trim();

        const fromItem = buildPartesDesdeItem(item);
        const parts = fromItem ?? parseUbicacionAComponentes(bodega, ubicacionFinal);
        if (!parts) {
            const detalle = ubicacionFinal ? ` (${ubicacionFinal})` : "";
            toast.error(`No pude interpretar la ubicacion${detalle}.`);
            return;
        }

        const filtro: FiltroGrupoUbicacion = {
            grupoId: grupo.id,
            bodega: bodega,
            rack: parts.rack,
            lado: parts.lado,
            altura: parts.altura,
            ubicacion: parts.ubicacion,
        };

        try {
            await eliminarFiltro(filtro);
            await load();
            toast.success("Ubicacion quitada del grupo.");
        } catch (err: any) {
            const msg = extraerMsgError(err, "No se pudo eliminar.");
            setError(msg);
            toast.error(msg);
        }
    };

    const itemsFiltrados = useMemo(() => {
        const fu = N(fUbic);
        const fi = N(fItem);
        const fl = N(fLote);

        return items.filter((it: any) => {
            const ubic = N(it?.ubicacion);
            const item = N(it?.item);
            const lote = N(it?.lote);

            if (fu && !ubic.includes(fu)) return false;
            if (fi && !item.includes(fi)) return false;
            if (fl && !lote.includes(fl)) return false;
            return true;
        });
    }, [items, fUbic, fItem, fLote]);

    const dupCount = useMemo(() => {
        const m = new Map<string, number>();
        if (dupMode === "") return m;

        for (const it of itemsFiltrados as any[]) {
            const ubic = N(it?.ubicacion);
            const item = N(it?.item);
            const lote = N(it?.lote);

            const key = dupMode === "UI" ? `${ubic}::${item}` : `${ubic}::${item}::${lote}`;
            m.set(key, (m.get(key) ?? 0) + 1);
        }

        return m;
    }, [itemsFiltrados, dupMode]);

    const itemsVista = useMemo(() => {
        const base =
            dupMode === ""
                ? itemsFiltrados
                : (itemsFiltrados as any[]).filter((it) => {
                      const ubic = N(it?.ubicacion);
                      const item = N(it?.item);
                      const lote = N(it?.lote);
                      const key = dupMode === "UI" ? `${ubic}::${item}` : `${ubic}::${item}::${lote}`;
                      return (dupCount.get(key) ?? 0) > 1;
                  });

        return [...(base as any[])].sort((a, b) => {
            const ai = N(a?.item), bi = N(b?.item);
            const c1 = ai.localeCompare(bi);
            if (c1 !== 0) return c1;

            const au = N(a?.ubicacion), bu = N(b?.ubicacion);
            const c2 = au.localeCompare(bu);
            if (c2 !== 0) return c2;

            const al = N(a?.lote), bl = N(b?.lote);
            return al.localeCompare(bl);
        });
    }, [itemsFiltrados, dupMode, dupCount]);

    const totalItems = items.length;
    const totalFiltrados = itemsVista.length;

    const clearFilters = () => {
        setFUbic("");
        setFItem("");
        setFLote("");
        setDupMode("");
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    return {
        itemsVista,
        loading,
        error,
        setError,
        mostrarLado,
        totalItems,
        totalFiltrados,
        fUbic,
        fItem,
        fLote,
        dupMode,
        setFUbic,
        setFItem,
        setFLote,
        setDupMode,
        clearFilters,
        agregarUbicacionesOpen,
        setAgregarUbicacionesOpen,
        agregarItemsOpen,
        setAgregarItemsOpen,
        handleQuitarUbicacion,
        handleOpenChange,
        load,
        N,
        dupCount,
    };
}
