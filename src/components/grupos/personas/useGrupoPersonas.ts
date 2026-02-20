import { useEffect, useMemo, useState } from "react";
import type { GrupoConteo } from "@/services/grupoConteoService";
import {
    agregarPersona,
    eliminarPersona,
    getPersonasPorGrupo,
    type GrupoPersona,
} from "@/services/grupoPersonaService";
import { toast } from "react-toastify";

interface UseGrupoPersonasOptions {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export function useGrupoPersonas({ open, grupo, onClose }: UseGrupoPersonasOptions) {
    const [personas, setPersonas] = useState<GrupoPersona[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAdd, setLoadingAdd] = useState(false);
    const [loadingDeleteId, setLoadingDeleteId] = useState<number | null>(null);
    const [usuarioId, setUsuarioId] = useState("");
    const [usuarioNombre, setUsuarioNombre] = useState("");
    const [error, setError] = useState<string | null>(null);

    const usuarioIdNum = useMemo(() => {
        const n = Number(usuarioId);
        return Number.isFinite(n) ? n : 0;
    }, [usuarioId]);

    const canAdd = useMemo(() => {
        return (
            !loadingAdd &&
            usuarioId.trim().length > 0 &&
            usuarioNombre.trim().length > 0 &&
            usuarioIdNum > 0
        );
    }, [loadingAdd, usuarioId, usuarioNombre, usuarioIdNum]);

    const emptyState = useMemo(() => {
        return !loading && !error && personas.length === 0;
    }, [loading, error, personas.length]);

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPersonasPorGrupo(grupo.id);
            setPersonas(Array.isArray(data) ? data : []);
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al cargar personas del grupo.");
            setError(msg);
            toast.error(msg);
            setPersonas([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && grupo) load();
    }, [open, grupo?.id]);

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    const handleAgregar = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!grupo) return;

        if (!usuarioIdNum) {
            toast.warning("El ID de usuario debe ser numerico.");
            return;
        }

        const nombre = usuarioNombre.trim();
        if (!nombre) {
            toast.warning("El nombre de usuario es obligatorio.");
            return;
        }

        setLoadingAdd(true);
        setError(null);

        try {
            await agregarPersona(grupo.id, usuarioIdNum, nombre);
            setUsuarioId("");
            setUsuarioNombre("");
            await load();
            toast.success("Persona agregada al grupo.");
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al agregar persona.");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoadingAdd(false);
        }
    };

    const handleEliminar = async (p: GrupoPersona) => {
        if (!grupo) return;
        if (loadingDeleteId !== null) return;

        setLoadingDeleteId(p.usuarioId);
        setError(null);

        try {
            await eliminarPersona(grupo.id, p.usuarioId);
            await load();
            toast.success("Persona eliminada del grupo.");
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al eliminar persona.");
            setError(msg);
            toast.error(msg);
        } finally {
            setLoadingDeleteId(null);
        }
    };

    return {
        personas,
        loading,
        loadingAdd,
        loadingDeleteId,
        usuarioId,
        usuarioNombre,
        error,
        setError,
        usuarioIdNum,
        canAdd,
        emptyState,
        setUsuarioId,
        setUsuarioNombre,
        handleOpenChange,
        handleAgregar,
        handleEliminar,
        load,
    };
}
