import { useMemo, useState, type FormEvent } from "react";
import {
    agregarUbicacionesAlGrupo,
    previsualizarItems,
    type ItemPhystag,
} from "@/services/grupoUbicacionService";
import { toast } from "react-toastify";

export type Bodega = "" | "11" | "13M";

interface UseGrupoUbicacionesAgregarFiltrosOptions {
    grupoId: number;
    onAfterAdd: () => void;
    onSetParentError: (msg: string | null) => void;
    onClose: () => void;
}

export function useGrupoUbicacionesAgregarFiltros({
    grupoId,
    onAfterAdd,
    onSetParentError,
    onClose,
}: UseGrupoUbicacionesAgregarFiltrosOptions) {
    const [bodega, setBodega] = useState<Bodega>("");

    const [rack11, setRack11] = useState("");
    const [altura11, setAltura11] = useState("");
    const [ubic11, setUbic11] = useState("");

    const [rack13, setRack13] = useState("");
    const [lado13, setLado13] = useState<"" | "A" | "B">("");
    const [altura13, setAltura13] = useState("");
    const [ubic13, setUbic13] = useState("");

    const [previewItems, setPreviewItems] = useState<ItemPhystag[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [agregando, setAgregando] = useState(false);
    const [previewStale, setPreviewStale] = useState(false);

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    const reset = () => {
        setBodega("");
        setRack11("");
        setAltura11("");
        setUbic11("");
        setRack13("");
        setLado13("");
        setAltura13("");
        setUbic13("");

        setPreviewItems([]);
        setPreviewError(null);
        setPreviewLoading(false);
        setPreviewStale(false);
        setAgregando(false);
    };

    const clearPreview = () => {
        setPreviewItems([]);
        setPreviewError(null);
        setPreviewStale(false);
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            reset();
            onClose();
        }
    };

    const handleBodegaChange = (value: Bodega) => {
        setBodega(value);
        setRack11("");
        setAltura11("");
        setUbic11("");
        setRack13("");
        setLado13("");
        setAltura13("");
        setUbic13("");
        clearPreview();
    };

    const handleRack11Change = (value: string) => {
        setRack11(value.toUpperCase().slice(0, 1));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleAltura11Change = (value: string) => {
        setAltura11(value.replace(/\D/g, "").slice(0, 1));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleUbic11Change = (value: string) => {
        setUbic11(value.replace(/\D/g, "").slice(0, 2));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleRack13Change = (value: string) => {
        setRack13(value.replace(/\D/g, "").slice(0, 2));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleLado13Change = (value: "" | "A" | "B") => {
        setLado13(value);
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleAltura13Change = (value: string) => {
        setAltura13(value.replace(/\D/g, "").slice(0, 1));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const handleUbic13Change = (value: string) => {
        setUbic13(value.replace(/\D/g, "").slice(0, 2));
        if (previewItems.length > 0) setPreviewStale(true);
    };

    const buildParams = () => {
        if (!bodega) return null;

        if (bodega === "11") {
            return {
                bodega,
                rack: N(rack11) || undefined,
                lado: undefined,
                altura: (altura11 || "").trim() || undefined,
                ubicacion: (ubic11 || "").trim() || undefined,
            };
        }

        return {
            bodega,
            rack: (rack13 || "").trim() || undefined,
            lado: N(lado13) || undefined,
            altura: (altura13 || "").trim() || undefined,
            ubicacion: (ubic13 || "").trim() || undefined,
        };
    };

    const handleBuscar = async (e: FormEvent) => {
        e.preventDefault();

        if (!bodega) {
            setPreviewError("Seleccione una bodega.");
            return;
        }

        clearPreview();

        const params = buildParams();
        if (!params) {
            setPreviewError("Seleccione una bodega.");
            return;
        }

        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewStale(false);

        try {
            const res = await previsualizarItems(params);
            const items = (res?.data || []) as ItemPhystag[];

            setPreviewItems(items);
            setPreviewStale(false);

            if (!items.length) {
                setPreviewError("No se encontraron items con ese filtro.");
                return;
            }
        } catch (err: any) {
            setPreviewError(extraerMsgError(err, "Error al buscar."));
        } finally {
            setPreviewLoading(false);
        }
    };

    const ubicacionesMaterializadas = useMemo(() => {
        const map = new Map<string, any>();

        for (const it of previewItems as any[]) {
            const ubicacionCompleta = N(it?.ubicacion);
            if (!ubicacionCompleta) continue;

            if (!map.has(ubicacionCompleta)) {
                map.set(ubicacionCompleta, {
                    ubicacion: ubicacionCompleta,
                    rack: N(it?.rackPasillo),
                    lado: N(it?.lado) || "",
                    altura: (it?.altura ?? "").toString().trim(),
                    posicion: (it?.posicion ?? "").toString().trim(),
                });
            }
        }

        return Array.from(map.values());
    }, [previewItems]);

    const handleConfirmarAgregar = async () => {
        if (agregando) return;
        if (!bodega) return;

        if (previewItems.length === 0 || ubicacionesMaterializadas.length === 0) {
            const msg = "Primero debes buscar (previsualizar) y tener resultados.";
            setPreviewError(msg);
            toast.warning(msg);
            return;
        }

        setAgregando(true);
        onSetParentError(null);

        try {
            await agregarUbicacionesAlGrupo({
                grupoId,
                bodega,
                ubicaciones: ubicacionesMaterializadas,
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

    const canBuscar = !previewLoading && !!bodega;
    const canAgregar =
        !agregando && !!bodega && !previewLoading && ubicacionesMaterializadas.length > 0;

    const mostrarLado = bodega === "13M";

    return {
        bodega,
        rack11,
        altura11,
        ubic11,
        rack13,
        lado13,
        altura13,
        ubic13,
        previewItems,
        previewLoading,
        previewError,
        previewStale,
        agregando,
        ubicacionesMaterializadas,
        canBuscar,
        canAgregar,
        mostrarLado,
        handleOpenChange,
        handleBodegaChange,
        handleRack11Change,
        handleAltura11Change,
        handleUbic11Change,
        handleRack13Change,
        handleLado13Change,
        handleAltura13Change,
        handleUbic13Change,
        handleBuscar,
        handleConfirmarAgregar,
        N,
    };
}
