import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Operacion } from "@/services/inventarioService";
import {
    GrupoConteo,
    getGruposDisponibles,
    getGruposPorOperacion,
    asignarOperacionAGrupo,
    desasociarOperacionGrupo,
} from "@/services/grupoConteoService";
import { toast } from "react-toastify";

interface OperacionGruposModalProps {
    open: boolean;
    operacion: Operacion | null;
    onClose: () => void;
    onVerPersonas: (grupo: GrupoConteo) => void;
    onVerUbicaciones: (grupo: GrupoConteo) => void;
}

const OperacionGruposModal = ({
                                  open,
                                  operacion,
                                  onClose,
                                  onVerPersonas,
                                  onVerUbicaciones,
                              }: OperacionGruposModalProps) => {
    const [gruposOperacion, setGruposOperacion] = useState<GrupoConteo[]>([]);
    const [gruposDisponibles, setGruposDisponibles] = useState<GrupoConteo[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingAsignar, setLoadingAsignar] = useState(false);
    const [loadingDesasociar, setLoadingDesasociar] = useState(false);

    const load = async () => {
        if (!operacion) return;
        setLoading(true);
        try {
            const [porOperacion, disponibles] = await Promise.all([
                getGruposPorOperacion(operacion.id),
                getGruposDisponibles(),
            ]);
            setGruposOperacion(porOperacion);
            setGruposDisponibles(disponibles);
        } catch {
            toast.error("Error al cargar los grupos de la operación.");
            setGruposOperacion([]);
            setGruposDisponibles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && operacion) {
            load();
        }
    }, [open, operacion?.id]);

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    const handleAsignar = async (grupo: GrupoConteo) => {
        if (!operacion) return;
        const yaAsociado = gruposOperacion.some((g) => g.id === grupo.id);
        if (yaAsociado) {
            toast.info("El grupo ya está asociado a la operación.");
            return;
        }
        setLoadingAsignar(true);
        try {
            await asignarOperacionAGrupo(operacion.id, grupo.id);
            toast.success("Grupo asociado a la operación.");
            await load();
        } catch {
            toast.error("No se pudo asociar el grupo a la operación.");
        } finally {
            setLoadingAsignar(false);
        }
    };

    const handleDesasociar = async (grupo: GrupoConteo) => {
        if (!operacion) return;
        setLoadingDesasociar(true);
        try {
            await desasociarOperacionGrupo(operacion.id, grupo.id);
            toast.success("Grupo desasociado de la operación.");
            await load();
        } catch {
            toast.error("No se pudo desasociar el grupo de la operación.");
        } finally {
            setLoadingDesasociar(false);
        }
    };

    if (!operacion) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Grupos de la operación</DialogTitle>
                        <DialogDescription>
                            Selecciona una operación para administrar sus grupos.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    const descripcionOperacion = `Operación ${operacion.id} · Bodega ${operacion.bodega} · ${operacion.tipo}`;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Grupos de la operación</DialogTitle>
                    <DialogDescription>
                        Administra los grupos responsables de la operación seleccionada.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-sm text-slate-600 mb-3">
                    <span className="font-medium text-slate-900">
                        {descripcionOperacion}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="border rounded-2xl bg-white shadow-sm flex flex-col">
                        <div className="px-3 py-2 border-b bg-slate-50 rounded-t-2xl flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                                Grupos asociados
                            </span>
                        </div>
                        <div className="p-3 flex-1 overflow-auto">
                            {loading ? (
                                <p className="text-slate-500 text-sm">
                                    Cargando grupos…
                                </p>
                            ) : gruposOperacion.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    La operación aún no tiene grupos asociados.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center text-xs">
                                                ID
                                            </TableHead>
                                            <TableHead className="text-xs">
                                                Nombre
                                            </TableHead>
                                            <TableHead className="text-center text-xs">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gruposOperacion.map((g) => (
                                            <TableRow key={g.id}>
                                                <TableCell className="text-center text-slate-700">
                                                    {g.id}
                                                </TableCell>
                                                <TableCell className="text-slate-900 font-medium">
                                                    {g.nombre}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-wrap gap-2 justify-center">
                                                        <Button
                                                            size="sm"
                                                            className="rounded-full text-xs h-7 px-3"
                                                            onClick={() =>
                                                                onVerPersonas(g)
                                                            }
                                                        >
                                                            Personas
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="rounded-full text-xs h-7 px-3"
                                                            onClick={() =>
                                                                onVerUbicaciones(g)
                                                            }
                                                        >
                                                            Ubicaciones
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="rounded-full text-xs h-7 px-3"
                                                            disabled={loadingDesasociar}
                                                            onClick={() =>
                                                                handleDesasociar(g)
                                                            }
                                                        >
                                                            Quitar
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>

                    <div className="border rounded-2xl bg-white shadow-sm flex flex-col">
                        <div className="px-3 py-2 border-b bg-slate-50 rounded-t-2xl flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                                Grupos disponibles
                            </span>
                        </div>
                        <div className="p-3 flex-1 overflow-auto">
                            {loading ? (
                                <p className="text-slate-500 text-sm">
                                    Cargando grupos…
                                </p>
                            ) : gruposDisponibles.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    No hay grupos disponibles.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center text-xs">
                                                ID
                                            </TableHead>
                                            <TableHead className="text-xs">
                                                Nombre
                                            </TableHead>
                                            <TableHead className="text-center text-xs">
                                                Acciones
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gruposDisponibles.map((g) => {
                                            const asociado = gruposOperacion.some(
                                                (go) => go.id === g.id
                                            );
                                            return (
                                                <TableRow key={g.id}>
                                                    <TableCell className="text-center text-slate-700">
                                                        {g.id}
                                                    </TableCell>
                                                    <TableCell className="text-slate-900 font-medium">
                                                        {g.nombre}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            size="sm"
                                                            className="rounded-full text-xs h-7 px-3"
                                                            disabled={
                                                                asociado ||
                                                                loadingAsignar
                                                            }
                                                            onClick={() =>
                                                                handleAsignar(g)
                                                            }
                                                        >
                                                            {asociado
                                                                ? "Ya asociado"
                                                                : "Asociar"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default OperacionGruposModal;
