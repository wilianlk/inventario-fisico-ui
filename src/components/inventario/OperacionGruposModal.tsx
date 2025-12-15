import { useEffect, useMemo, useState } from "react";
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
import { getPersonasPorGrupo } from "@/services/grupoPersonaService";
import { getUbicacionesPorGrupo } from "@/services/grupoUbicacionService";
import { toast } from "react-toastify";

interface OperacionGruposModalProps {
    open: boolean;
    operacion: Operacion | null;
    onClose: () => void;
    onVerPersonas: (grupo: GrupoConteo) => void;
    onVerUbicaciones: (grupo: GrupoConteo) => void;
}

type GrupoEstado = {
    personas: number | null;
    ubicaciones: number | null;
    loading: boolean;
    error: boolean;
};

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

    const [estadoPorGrupo, setEstadoPorGrupo] = useState<Record<number, GrupoEstado>>({});

    const cargarEstados = async (grupos: GrupoConteo[]) => {
        if (!grupos || grupos.length === 0) {
            setEstadoPorGrupo({});
            return;
        }

        setEstadoPorGrupo((prev) => {
            const next: Record<number, GrupoEstado> = { ...prev };
            for (const g of grupos) {
                next[g.id] = {
                    personas: prev[g.id]?.personas ?? null,
                    ubicaciones: prev[g.id]?.ubicaciones ?? null,
                    loading: true,
                    error: false,
                };
            }
            return next;
        });

        await Promise.all(
            grupos.map(async (g) => {
                try {
                    const [personas, ubicaciones] = await Promise.all([
                        getPersonasPorGrupo(g.id),
                        getUbicacionesPorGrupo(g.id),
                    ]);

                    setEstadoPorGrupo((prev) => ({
                        ...prev,
                        [g.id]: {
                            personas: Array.isArray(personas) ? personas.length : 0,
                            ubicaciones: Array.isArray(ubicaciones) ? ubicaciones.length : 0,
                            loading: false,
                            error: false,
                        },
                    }));
                } catch {
                    setEstadoPorGrupo((prev) => ({
                        ...prev,
                        [g.id]: {
                            personas: null,
                            ubicaciones: null,
                            loading: false,
                            error: true,
                        },
                    }));
                }
            })
        );
    };

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

            await cargarEstados(porOperacion);
        } catch {
            toast.error("Error al cargar los grupos de la operación.");
            setGruposOperacion([]);
            setGruposDisponibles([]);
            setEstadoPorGrupo({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && operacion) load();
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

    const resumen = useMemo(() => {
        const items = gruposOperacion.map((g) => {
            const st = estadoPorGrupo[g.id];
            const personas = st?.personas;
            const ubicaciones = st?.ubicaciones;
            const loading = st?.loading;
            const error = st?.error;

            const faltaPersonas = !loading && !error && (personas ?? 0) === 0;
            const faltaUbicaciones = !loading && !error && (ubicaciones ?? 0) === 0;

            return {
                grupo: g,
                loading: !!loading,
                error: !!error,
                faltaPersonas,
                faltaUbicaciones,
                incompleto: faltaPersonas || faltaUbicaciones,
            };
        });

        const incompletos = items.filter((x) => x.incompleto);
        return {
            items,
            incompletos,
            hayIncompletos: incompletos.length > 0,
        };
    }, [gruposOperacion, estadoPorGrupo]);

    const badge = (variant: "ok" | "warn" | "err" | "load", text: string) => {
        const cls =
            variant === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : variant === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : variant === "err"
                        ? "border-red-200 bg-red-50 text-red-900"
                        : "border-slate-200 bg-slate-50 text-slate-700";

        return (
            <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
            >
                {text}
            </span>
        );
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

    const descripcionOperacion = `Operación ${operacion.id} · Bodega ${operacion.bodega} · Conteo ${operacion.numeroConteo}`;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Grupos de la operación</DialogTitle>
                    <DialogDescription>
                        Administra los grupos responsables y valida que tengan personas y ubicaciones antes de cerrar.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-sm text-slate-600 mb-3 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{descripcionOperacion}</span>
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-7 px-3 text-xs"
                        onClick={load}
                        disabled={loading || loadingAsignar || loadingDesasociar}
                    >
                        Actualizar
                    </Button>
                </div>

                {resumen.hayIncompletos ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <div className="font-semibold">Hay grupos incompletos</div>
                        <div className="text-xs mt-1">
                            Antes de cerrar, completa personas y ubicaciones en:
                            <span className="font-medium">
                                {" "}
                                {resumen.incompletos.map((x) => x.grupo.nombre).join(", ")}
                            </span>
                        </div>
                    </div>
                ) : gruposOperacion.length > 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        <div className="font-semibold">Todo listo</div>
                        <div className="text-xs mt-1">
                            Todos los grupos asociados tienen personas y ubicaciones.
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-3">
                    <div className="border rounded-2xl bg-white shadow-sm flex flex-col">
                        <div className="px-3 py-2 border-b bg-slate-50 rounded-t-2xl flex items-center justify-between">
                            <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">
                                Grupos asociados
                            </span>
                        </div>
                        <div className="p-3 flex-1 overflow-auto">
                            {loading ? (
                                <p className="text-slate-500 text-sm">Cargando grupos…</p>
                            ) : gruposOperacion.length === 0 ? (
                                <p className="text-slate-500 text-sm">
                                    La operación aún no tiene grupos asociados.
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center text-xs">ID</TableHead>
                                            <TableHead className="text-xs">Nombre</TableHead>
                                            <TableHead className="text-center text-xs">Personas</TableHead>
                                            <TableHead className="text-center text-xs">Ubicaciones</TableHead>
                                            <TableHead className="text-center text-xs">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gruposOperacion.map((g) => {
                                            const st = estadoPorGrupo[g.id];
                                            const loadingSt = st?.loading ?? false;
                                            const errorSt = st?.error ?? false;

                                            const personas = st?.personas;
                                            const ubicaciones = st?.ubicaciones;

                                            const faltaPersonas =
                                                !loadingSt && !errorSt && (personas ?? 0) === 0;
                                            const faltaUbicaciones =
                                                !loadingSt && !errorSt && (ubicaciones ?? 0) === 0;

                                            const rowClass =
                                                faltaPersonas || faltaUbicaciones
                                                    ? "bg-amber-50/60"
                                                    : "";

                                            return (
                                                <TableRow key={g.id} className={rowClass}>
                                                    <TableCell className="text-center text-slate-700">
                                                        {g.id}
                                                    </TableCell>
                                                    <TableCell className="text-slate-900 font-medium">
                                                        {g.nombre}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {loadingSt
                                                            ? badge("load", "...")
                                                            : errorSt
                                                                ? badge("err", "Error")
                                                                : faltaPersonas
                                                                    ? badge("warn", "Faltan")
                                                                    : badge("ok", `${personas ?? 0}`)}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        {loadingSt
                                                            ? badge("load", "...")
                                                            : errorSt
                                                                ? badge("err", "Error")
                                                                : faltaUbicaciones
                                                                    ? badge("warn", "Faltan")
                                                                    : badge("ok", `${ubicaciones ?? 0}`)}
                                                    </TableCell>

                                                    <TableCell className="text-center">
                                                        <div className="flex flex-wrap gap-2 justify-center">
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full text-xs h-7 px-3"
                                                                onClick={() => onVerPersonas(g)}
                                                            >
                                                                Personas
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="rounded-full text-xs h-7 px-3"
                                                                onClick={() => onVerUbicaciones(g)}
                                                            >
                                                                Ubicaciones
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="rounded-full text-xs h-7 px-3"
                                                                disabled={loadingDesasociar}
                                                                onClick={() => handleDesasociar(g)}
                                                            >
                                                                Quitar
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
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
                                <p className="text-slate-500 text-sm">Cargando grupos…</p>
                            ) : gruposDisponibles.length === 0 ? (
                                <p className="text-slate-500 text-sm">No hay grupos disponibles.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-center text-xs">ID</TableHead>
                                            <TableHead className="text-xs">Nombre</TableHead>
                                            <TableHead className="text-center text-xs">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {gruposDisponibles.map((g) => {
                                            const asociado = gruposOperacion.some((go) => go.id === g.id);
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
                                                            disabled={asociado || loadingAsignar}
                                                            onClick={() => handleAsignar(g)}
                                                        >
                                                            {asociado ? "Ya asociado" : "Asociar"}
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
