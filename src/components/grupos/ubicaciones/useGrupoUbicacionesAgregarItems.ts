import { useMemo, useState } from "react";
import {
    agregarUbicacionesAlGrupo,
    buscarPorItem,
    type ItemBusquedaPorItem,
} from "@/services/grupoUbicacionService";
import { toast } from "react-toastify";

export type Bodega = "" | "11" | "13M";

interface UseGrupoUbicacionesAgregarItemsOptions {
    grupoId: number;
    onAfterAdd: () => void;
    onSetParentError: (msg: string | null) => void;
    onClose: () => void;
}

export function useGrupoUbicacionesAgregarItems({
    grupoId,
    onAfterAdd,
    onSetParentError,
    onClose,
}: UseGrupoUbicacionesAgregarItemsOptions) {
    const [bodega, setBodega] = useState<Bodega>("");

    const [itemCodigo, setItemCodigo] = useState("");
    const [itemLote, setItemLote] = useState("");
    const [itemResults, setItemResults] = useState<ItemBusquedaPorItem[]>([]);
    const [itemLoading, setItemLoading] = useState(false);
    const [itemError, setItemError] = useState<string | null>(null);
    const [itemSelected, setItemSelected] = useState<Record<string, boolean>>({});
    const [agregando, setAgregando] = useState(false);
    const [filtroUbicacion, setFiltroUbicacion] = useState("");
    const [filtroRack, setFiltroRack] = useState("");
    const [filtroAltura, setFiltroAltura] = useState("");
    const [filtroPosicion, setFiltroPosicion] = useState("");
    const [filtroLote, setFiltroLote] = useState("");
    const [filtroLado, setFiltroLado] = useState("");
    const [filtroDescripcion, setFiltroDescripcion] = useState("");

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    const reset = () => {
        setBodega("");
        setItemCodigo("");
        setItemLote("");
        setItemResults([]);
        setItemError(null);
        setItemLoading(false);
        setItemSelected({});
        setAgregando(false);
        setFiltroUbicacion("");
        setFiltroRack("");
        setFiltroAltura("");
        setFiltroPosicion("");
        setFiltroLote("");
        setFiltroLado("");
        setFiltroDescripcion("");
    };

    const clearItemResults = () => {
        setItemResults([]);
        setItemError(null);
        setItemSelected({});
        setFiltroUbicacion("");
        setFiltroRack("");
        setFiltroAltura("");
        setFiltroPosicion("");
        setFiltroLote("");
        setFiltroLado("");
        setFiltroDescripcion("");
    };

    const clearItemFilters = () => {
        setFiltroUbicacion("");
        setFiltroRack("");
        setFiltroAltura("");
        setFiltroPosicion("");
        setFiltroLote("");
        setFiltroLado("");
        setFiltroDescripcion("");
        setItemSelected({});
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            reset();
            onClose();
        }
    };

    const handleBodegaChange = (value: Bodega) => {
        setBodega(value);
        setItemCodigo("");
        setItemLote("");
        clearItemResults();
    };

    const handleItemCodigoChange = (value: string) => {
        setItemCodigo(value);
        clearItemResults();
    };

    const handleItemLoteChange = (value: string) => {
        setItemLote(value);
        clearItemResults();
    };

    const buildItemKey = (it: ItemBusquedaPorItem) => {
        const b = N(it.bodega);
        const item = N(it.item);
        const ubic = N(it.ubicacion);
        const lote = N(it.lote);
        const rack = N(it.rackPasillo);
        const lado = N(it.lado);
        const altura = N(it.altura);
        const pos = N(it.posicion);
        return `${b}||${item}||${ubic}||${lote}||${rack}||${lado}||${altura}||${pos}`;
    };

    const filteredItemResults = useMemo(() => {
        if (!itemResults.length) return [];

        const fUbic = N(filtroUbicacion);
        const fRack = N(filtroRack);
        const fAltura = N(filtroAltura);
        const fPos = N(filtroPosicion);
        const fLote = N(filtroLote);
        const fLado = N(filtroLado);
        const fDesc = N(filtroDescripcion);

        return itemResults.filter((it) => {
            if (fUbic && !N(it.ubicacion).includes(fUbic)) return false;
            if (fRack && !N(it.rackPasillo).includes(fRack)) return false;
            if (fAltura && !N(it.altura).includes(fAltura)) return false;
            if (fPos && !N(it.posicion).includes(fPos)) return false;
            if (fLote && !N(it.lote).includes(fLote)) return false;
            if (fLado && !N(it.lado).includes(fLado)) return false;
            if (fDesc && !N(it.descripcion).includes(fDesc)) return false;
            return true;
        });
    }, [
        itemResults,
        filtroUbicacion,
        filtroRack,
        filtroAltura,
        filtroPosicion,
        filtroLote,
        filtroLado,
        filtroDescripcion,
    ]);

    const hasActiveFilters = useMemo(() => {
        return [
            filtroUbicacion,
            filtroRack,
            filtroAltura,
            filtroPosicion,
            filtroLote,
            filtroLado,
            filtroDescripcion,
        ].some((v) => v.trim().length > 0);
    }, [
        filtroUbicacion,
        filtroRack,
        filtroAltura,
        filtroPosicion,
        filtroLote,
        filtroLado,
        filtroDescripcion,
    ]);

    const handleBuscarItem = async () => {
        if (!bodega) {
            setItemError("Seleccione una bodega.");
            return;
        }

        const item = itemCodigo.trim();
        if (!item) {
            setItemError("El codigo de item es obligatorio.");
            return;
        }

        clearItemResults();

        setItemLoading(true);
        setItemError(null);

        try {
            const res = await buscarPorItem({
                bodega,
                item,
                lote: itemLote.trim() || undefined,
            });

            const data = (res?.data || []) as ItemBusquedaPorItem[];
            setItemResults(data);

            if (!data.length) {
                const msg = res?.mensaje || "No se encontraron items con ese codigo.";
                setItemError(msg);
                return;
            }

            setItemSelected({});
        } catch (err: any) {
            setItemError(extraerMsgError(err, "Error al buscar item."));
        } finally {
            setItemLoading(false);
        }
    };

    const ubicacionesDesdeItem = useMemo(() => {
        const map = new Map<string, any>();
        const selected = itemResults.filter((it) => itemSelected[buildItemKey(it)]);

        for (const it of selected) {
            const ubicacion = N(it?.ubicacion);
            if (!ubicacion) continue;

            const rack = N(it?.rackPasillo);
            const lado = N(it?.lado) || "";
            const altura = (it?.altura ?? "").toString().trim();
            const posicion = (it?.posicion ?? "").toString().trim();
            const key = `${ubicacion}||${rack}||${lado}||${altura}||${posicion}`;

            if (!map.has(key)) {
                map.set(key, {
                    ubicacion,
                    rack,
                    lado,
                    altura,
                    posicion,
                });
            }
        }

        return Array.from(map.values());
    }, [itemResults, itemSelected]);

    const selectedCount = useMemo(
        () => itemResults.filter((it) => itemSelected[buildItemKey(it)]).length,
        [itemResults, itemSelected]
    );

    const selectedVisibleCount = useMemo(
        () => filteredItemResults.filter((it) => itemSelected[buildItemKey(it)]).length,
        [filteredItemResults, itemSelected]
    );

    const allItemsSelected = useMemo(
        () =>
            filteredItemResults.length > 0 &&
            filteredItemResults.every((it) => itemSelected[buildItemKey(it)]),
        [filteredItemResults, itemSelected]
    );

    const toggleSelectAll = (checked: boolean) => {
        setItemSelected((prev) => {
            const next = { ...prev };
            for (const it of filteredItemResults) {
                next[buildItemKey(it)] = checked;
            }
            return next;
        });
    };

    const toggleItemSelection = (it: ItemBusquedaPorItem, checked: boolean) => {
        const key = buildItemKey(it);
        setItemSelected((prev) => ({
            ...prev,
            [key]: checked,
        }));
    };

    const clearHiddenSelections = () => {
        setItemSelected((prev) => {
            const visibleKeys = new Set(filteredItemResults.map((it) => buildItemKey(it)));
            const next: Record<string, boolean> = {};
            for (const [key, value] of Object.entries(prev)) {
                if (visibleKeys.has(key)) {
                    next[key] = value;
                }
            }
            return next;
        });
    };

    const handleConfirmarAgregar = async () => {
        if (agregando) return;
        if (!bodega) return;

        if (itemResults.length === 0 || ubicacionesDesdeItem.length === 0) {
            const msg = "Seleccione al menos una ubicacion del resultado.";
            setItemError(msg);
            toast.warning(msg);
            return;
        }

        setAgregando(true);
        onSetParentError(null);

        try {
            await agregarUbicacionesAlGrupo({
                grupoId,
                bodega,
                ubicaciones: ubicacionesDesdeItem,
            });

            await onAfterAdd();
            toast.success("Ubicaciones agregadas correctamente.");
            reset();
            onClose();
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al agregar.");
            toast.error("No se pudieron agregar las ubicaciones.");
            onSetParentError(msg);
        } finally {
            setAgregando(false);
        }
    };

    const canBuscarItem = !itemLoading && !!bodega && !!itemCodigo.trim();
    const canAgregar =
        !agregando &&
        !!bodega &&
        !itemLoading &&
        ubicacionesDesdeItem.length > 0 &&
        selectedVisibleCount > 0;

    const mostrarLado = bodega === "13M";

    return {
        bodega,
        itemCodigo,
        itemLote,
        itemResults,
        filteredItemResults,
        itemLoading,
        itemError,
        itemSelected,
        agregando,
        selectedCount,
        selectedVisibleCount,
        allItemsSelected,
        ubicacionesDesdeItem,
        hasActiveFilters,
        filtroUbicacion,
        filtroRack,
        filtroAltura,
        filtroPosicion,
        filtroLote,
        filtroLado,
        filtroDescripcion,
        canBuscarItem,
        canAgregar,
        mostrarLado,
        handleOpenChange,
        handleBodegaChange,
        handleItemCodigoChange,
        handleItemLoteChange,
        handleBuscarItem,
        handleConfirmarAgregar,
        buildItemKey,
        toggleSelectAll,
        toggleItemSelection,
        clearHiddenSelections,
        clearItemFilters,
        setFiltroUbicacion,
        setFiltroRack,
        setFiltroAltura,
        setFiltroPosicion,
        setFiltroLote,
        setFiltroLado,
        setFiltroDescripcion,
        N,
    };
}
