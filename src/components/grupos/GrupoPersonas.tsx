import { useEffect, useMemo, useState } from "react";
import {
    GrupoPersona,
    getPersonasPorGrupo,
    agregarPersona,
    eliminarPersona,
} from "@/services/grupoPersonaService";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

interface GrupoPersonasProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export function GrupoPersonas({ open, grupo, onClose }: GrupoPersonasProps) {
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

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPersonasPorGrupo(grupo.id);
            setPersonas(Array.isArray(data) ? data : []);
        } catch {
            setError("Error al cargar personas del grupo.");
            toast.error("No se pudieron cargar las personas del grupo.");
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
            toast.warning("El ID de usuario debe ser numérico.");
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
        } catch {
            setError("Error al agregar persona.");
            toast.error("No se pudo agregar la persona al grupo.");
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
        } catch {
            setError("Error al eliminar persona.");
            toast.error("No se pudo eliminar la persona del grupo.");
        } finally {
            setLoadingDeleteId(null);
        }
    };

    if (!grupo) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Personas del grupo</DialogTitle>
                        <DialogDescription>
                            Selecciona un grupo para administrar sus personas.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Personas del grupo</DialogTitle>
                    <DialogDescription>
                        Administra los usuarios asignados al grupo seleccionado.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-start justify-between gap-3 mb-2 text-sm text-slate-600">
                    <div className="space-y-1">
                        <div>
                            Grupo:{" "}
                            <span className="font-medium text-slate-900">{grupo.nombre}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                            {personas.length === 0 ? (
                                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">
                                    Sin personas
                                </span>
                            ) : (
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                                    {personas.length} personas
                                </span>
                            )}
                        </div>
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={load}
                        disabled={loading || loadingAdd}
                        className="rounded-full h-8 px-3 text-xs"
                    >
                        Actualizar
                    </Button>
                </div>

                {error ? (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                        {error}
                    </div>
                ) : null}

                {emptyState ? (
                    <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                        <div className="text-sm font-semibold text-amber-900">
                            Este grupo no tiene personas
                        </div>
                        <div className="text-xs text-amber-900/80 mt-1">
                            Agrega al menos una persona para que el grupo pueda participar y permitir el cierre de la operación.
                        </div>
                    </div>
                ) : null}

                <form
                    onSubmit={handleAgregar}
                    className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
                >
                    <div className="flex-1 min-w-[120px]">
                        <Label htmlFor="usuarioId" className="text-xs text-slate-600 mb-1">
                            ID usuario
                        </Label>
                        <Input
                            id="usuarioId"
                            className="text-sm"
                            value={usuarioId}
                            onChange={(e) => setUsuarioId(e.target.value)}
                            placeholder="Ej: 12345"
                            inputMode="numeric"
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <Label htmlFor="usuarioNombre" className="text-xs text-slate-600 mb-1">
                            Nombre usuario
                        </Label>
                        <Input
                            id="usuarioNombre"
                            className="text-sm"
                            value={usuarioNombre}
                            onChange={(e) => setUsuarioNombre(e.target.value)}
                            placeholder="Ej: Juan Pérez"
                        />
                    </div>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!canAdd}
                        className="rounded-full h-8 px-4 text-xs"
                    >
                        {loadingAdd ? "Agregando..." : "Agregar"}
                    </Button>
                </form>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl">
                    {loading ? (
                        <div className="p-4 text-sm text-slate-600">Cargando...</div>
                    ) : personas.length === 0 ? (
                        <div className="p-6 text-center">
                            <div className="text-sm font-semibold text-slate-900">No hay personas</div>
                            <div className="text-xs text-slate-600 mt-1">
                                Agrega una persona usando el formulario superior.
                            </div>
                        </div>
                    ) : (
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-100 text-slate-600">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium">ID</th>
                                <th className="px-3 py-2 text-left font-medium">Usuario</th>
                                <th className="px-3 py-2 text-left font-medium">Nombre</th>
                                <th className="px-3 py-2 text-right font-medium">Acciones</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                            {personas.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 text-slate-700">{p.id}</td>
                                    <td className="px-3 py-2 text-slate-700">{p.usuarioId}</td>
                                    <td className="px-3 py-2 text-slate-900">{p.usuarioNombre}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-red-600 hover:text-red-700"
                                            onClick={() => handleEliminar(p)}
                                            disabled={loadingDeleteId === p.usuarioId}
                                        >
                                            {loadingDeleteId === p.usuarioId ? "Eliminando..." : "Eliminar"}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
