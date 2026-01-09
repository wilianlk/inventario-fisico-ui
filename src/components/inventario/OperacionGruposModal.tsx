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
import { GrupoConteo, getGruposPorOperacion } from "@/services/grupoConteoService";
import { getPersonasPorGrupo } from "@/services/grupoPersonaService";
import { obtenerItemsPorGrupo } from "@/services/grupoUbicacionService";
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
    const [loading, setLoading] = useState(false);
    const [estadoPorGrupo, setEstadoPorGrupo] = useState<Record<number, GrupoEstado>>({});

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

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
                    const [personas, itemsRes] = await Promise.all([
                        getPersonasPorGrupo(g.id),
                        obtenerItemsPorGrupo(g.id),
                    ]);

                    const items = (itemsRes as any)?.data ?? [];
                    const ubicacionesUnicas = new Set(
                        (Array.isArray(items) ? items : [])
                            .map((x: any) => N(x?.ubicacion))
                            .filter(Boolean)
                    ).size;

                    setEstadoPorGrupo((prev) => ({
                        ...prev,
                        [g.id]: {
                            personas: Array.isArray(personas) ? personas.length : 0,
                            ubicaciones: ubicacionesUnicas,
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
            const porOperacion = await getGruposPorOperacion(operacion.id);
            setGruposOperacion(porOperacion);
            await cargarEstados(porOperacion);
        } catch {
            toast.error("Error al cargar los grupos de la operación.");
            setGruposOperacion([]);
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
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
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
                        <DialogDescription>Selecciona una operación para ver sus grupos.</DialogDescription>
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
                    <DialogDescription>Valida personas y ubicaciones antes de cerrar.</DialogDescription>
                </DialogHeader>

                <div className="text-sm text-slate-600 mb-3 flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-900">{descripcionOperacion}</span>
                    <Button size="sm" variant="outline" className="rounded-full h-7 px-3 text-xs" onClick={load} disabled={loading}>
                        Actualizar
                    </Button>
                </div>

                {resumen.hayIncompletos ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                        <div className="font-semibold">Hay grupos incompletos</div>
                        <div className="text-xs mt-1">
                            Antes de cerrar, completa personas y ubicaciones en:
                            <span className="font-medium"> {resumen.incompletos.map((x) => x.grupo.nombre).join(", ")}</span>
                        </div>
                    </div>
                ) : gruposOperacion.length > 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                        <div className="font-semibold">Todo listo</div>
                        <div className="text-xs mt-1">Todos los grupos asociados tienen personas y ubicaciones.</div>
                    </div>
                ) : null}

                <div className="border rounded-2xl bg-white shadow-sm flex flex-col mt-3">
                    <div className="px-3 py-2 border-b bg-slate-50 rounded-t-2xl flex items-center justify-between">
                        <span className="font-semibold text-slate-800 text-xs uppercase tracking-wide">Grupos asociados</span>
                    </div>

                    <div className="p-3 flex-1 overflow-auto">
                        {loading ? (
                            <p className="text-slate-500 text-sm">Cargando grupos…</p>
                        ) : gruposOperacion.length === 0 ? (
                            <p className="text-slate-500 text-sm">La operación aún no tiene grupos asociados.</p>
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

                                        const faltaPersonas = !loadingSt && !errorSt && (personas ?? 0) === 0;
                                        const faltaUbicaciones = !loadingSt && !errorSt && (ubicaciones ?? 0) === 0;

                                        const rowClass = faltaPersonas || faltaUbicaciones ? "bg-amber-50/60" : "";

                                        return (
                                            <TableRow key={g.id} className={rowClass}>
                                                <TableCell className="text-center text-slate-700">{g.id}</TableCell>
                                                <TableCell className="text-slate-900 font-medium">{g.nombre}</TableCell>

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
