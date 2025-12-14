import { useEffect, useState } from "react";
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
    const [usuarioId, setUsuarioId] = useState("");
    const [usuarioNombre, setUsuarioNombre] = useState("");
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getPersonasPorGrupo(grupo.id);
            setPersonas(data);
        } catch {
            setError("Error al cargar personas del grupo.");
            toast.error("No se pudieron cargar las personas del grupo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && grupo) {
            load();
        }
    }, [open, grupo?.id]);

    if (!grupo) return null;

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    const handleAgregar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usuarioId.trim() || !usuarioNombre.trim()) return;
        const userIdNum = Number(usuarioId);
        if (!userIdNum) return;
        setLoadingAdd(true);
        setError(null);
        try {
            await agregarPersona(grupo.id, userIdNum, usuarioNombre.trim());
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
        try {
            await eliminarPersona(grupo.id, p.usuarioId);
            await load();
            toast.success("Persona eliminada del grupo.");
        } catch {
            setError("Error al eliminar persona.");
            toast.error("No se pudo eliminar la persona del grupo.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Personas del grupo</DialogTitle>
                    <DialogDescription>
                        Administra los usuarios asignados al grupo seleccionado.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-sm text-slate-600 mb-2">
                    Grupo:{" "}
                    <span className="font-medium text-slate-900">{grupo.nombre}</span>
                </div>

                {error && (
                    <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <form
                    onSubmit={handleAgregar}
                    className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
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
                        />
                    </div>
                    <div className="flex-1 min-w-[160px]">
                        <Label
                            htmlFor="usuarioNombre"
                            className="text-xs text-slate-600 mb-1"
                        >
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
                        disabled={loadingAdd}
                        className="text-sm"
                    >
                        {loadingAdd ? "Agregando..." : "Agregar"}
                    </Button>
                </form>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                    {loading ? (
                        <div className="p-4 text-sm text-slate-600">Cargando...</div>
                    ) : personas.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">
                            No hay personas asignadas.
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
                                    <td className="px-3 py-2 text-slate-700">
                                        {p.usuarioId}
                                    </td>
                                    <td className="px-3 py-2 text-slate-900">
                                        {p.usuarioNombre}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-red-600 hover:text-red-700"
                                            onClick={() => handleEliminar(p)}
                                        >
                                            Eliminar
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
