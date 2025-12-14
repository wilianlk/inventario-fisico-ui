import { useEffect, useState } from "react";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    getUbicacionesPorGrupo,
    eliminarUbicacion,
    ItemConUbicacion,
} from "@/services/grupoUbicacionService";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "react-toastify";
import { GrupoUbicacionesAgregarDialog } from "./GrupoUbicacionesAgregarDialog";

interface GrupoUbicacionesProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export interface UbicacionConItems {
    ubicacion: {
        id: number;
        grupoId: number;
        ubicacion: string;
    };
    items: ItemConUbicacion[];
}

export function GrupoUbicaciones({ open, grupo, onClose }: GrupoUbicacionesProps) {
    const [ubicaciones, setUbicaciones] = useState<UbicacionConItems[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agregarOpen, setAgregarOpen] = useState(false);
    const [filtroDesde, setFiltroDesde] = useState("");
    const [filtroHasta, setFiltroHasta] = useState("");

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);
        try {
            const data = await getUbicacionesPorGrupo(grupo.id);
            setUbicaciones(data as UbicacionConItems[]);
        } catch {
            setError("Error al cargar ubicaciones del grupo.");
            toast.error("No se pudieron cargar las ubicaciones del grupo.");
            setUbicaciones([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEliminar = async (ubicacion: string) => {
        if (!grupo) return;
        try {
            await eliminarUbicacion(grupo.id, ubicacion);
            await load();
            toast.success("Ubicación eliminada del grupo.");
        } catch {
            setError("Error al eliminar ubicación.");
            toast.error("No se pudo eliminar la ubicación del grupo.");
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

    const ubicacionesFiltradas = ubicaciones.filter((u) => {
        const code = u.ubicacion.ubicacion?.trim().toUpperCase() ?? "";
        if (!code) return false;

        const desde = filtroDesde.trim().toUpperCase();
        const hasta = filtroHasta.trim().toUpperCase();

        if (desde && code < desde) return false;
        if (hasta && code > hasta) return false;

        return true;
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Ubicaciones del grupo</DialogTitle>
                    <DialogDescription>
                        Administra las ubicaciones asignadas al grupo seleccionado.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-between mb-2 text-sm text-slate-600">
                    <div>
                        Grupo: <span className="font-medium text-slate-900">{grupo.nombre}</span>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            setAgregarOpen(true);
                        }}
                    >
                        Agregar ubicación
                    </Button>
                </div>

                {error && (
                    <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                    <div className="flex-1 min-w-[120px]">
                        <Label htmlFor="filtroDesde" className="text-xs text-slate-600 mb-1">
                            Filtrar desde
                        </Label>
                        <Input
                            id="filtroDesde"
                            className="text-sm"
                            value={filtroDesde}
                            onChange={(e) => setFiltroDesde(e.target.value.toUpperCase())}
                            placeholder="Ej: E200"
                        />
                    </div>
                    <div className="flex-1 min-w-[120px]">
                        <Label htmlFor="filtroHasta" className="text-xs text-slate-600 mb-1">
                            Hasta
                        </Label>
                        <Input
                            id="filtroHasta"
                            className="text-sm"
                            value={filtroHasta}
                            onChange={(e) => setFiltroHasta(e.target.value.toUpperCase())}
                            placeholder="Ej: E299"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                            setFiltroDesde("");
                            setFiltroHasta("");
                        }}
                    >
                        Limpiar
                    </Button>
                </div>

                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
                    {loading ? (
                        <div className="p-4 text-sm text-slate-600">Cargando...</div>
                    ) : ubicacionesFiltradas.length === 0 ? (
                        <div className="p-4 text-sm text-slate-500">
                            No hay ubicaciones asignadas.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">ID</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Ítems</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {ubicacionesFiltradas.map((u) => (
                                    <TableRow key={u.ubicacion.id}>
                                        <TableCell className="text-slate-700">
                                            {u.ubicacion.id}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900">
                                            {u.ubicacion.ubicacion}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                                {u.items?.map((item) => (
                                                    <div
                                                        key={item.item}
                                                        className="text-xs text-slate-700 leading-snug"
                                                    >
                            <span className="font-mono mr-2">
                              {item.item.trim()}
                            </span>
                                                        <span className="text-slate-900">
                              {item.descripcion.trim()}
                            </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-red-600 hover:text-red-700"
                                                onClick={() => handleEliminar(u.ubicacion.ubicacion)}
                                            >
                                                Eliminar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {grupo && (
                    <GrupoUbicacionesAgregarDialog
                        open={agregarOpen}
                        grupo={grupo}
                        onClose={() => setAgregarOpen(false)}
                        onAfterAdd={load}
                        onSetParentError={setError}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
