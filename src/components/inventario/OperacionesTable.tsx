import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { Operacion, OperacionConteoGrupo } from "@/services/inventarioService";
import { eliminarConteo } from "@/services/conteoService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";

interface OperacionesTableProps {
    operaciones: Operacion[];
    loading: boolean;
    onCerrar: (id: number) => void;
    onEliminar: (id: number) => void;
    formatearFecha: (valor: string) => string;
    onVerGrupos: (op: Operacion) => void;
    onAgregarConteo: (op: Operacion) => void;
    onConteoEliminado?: () => void;
}

type EnlaceGrupo = {
    grupoId: number;
    nombre: string;
    url: string;
};

const OperacionesTable = ({
                              operaciones,
                              loading,
                              onCerrar,
                              onEliminar,
                              formatearFecha,
                              onAgregarConteo,
                              onConteoEliminado,
                          }: OperacionesTableProps) => {
    const ops = Array.isArray(operaciones) ? operaciones : [];

    const [openEnlaces, setOpenEnlaces] = useState(false);
    const [opEnlaces, setOpEnlaces] = useState<Operacion | null>(null);
    const [loadingEnlaces, setLoadingEnlaces] = useState(false);
    const [enlaces, setEnlaces] = useState<EnlaceGrupo[]>([]);
    const [eliminandoByConteoId, setEliminandoByConteoId] = useState<Record<number, boolean>>({});
    const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
    const [conteoAEliminar, setConteoAEliminar] = useState<{
        conteoId: number;
        operacionId: number;
        numeroConteo: number;
        grupoNombre: string;
    } | null>(null);

    const origin = useMemo(() => {
        const fromEnv = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
        const fromStorage = localStorage.getItem("PUBLIC_APP_URL");
        const raw = fromEnv || fromStorage || window.location.origin;
        return String(raw).replace(/\/+$/, "");
    }, []);

    const copiar = async (texto: string) => {
        try {
            await navigator.clipboard.writeText(texto);
            toast.success("Enlace copiado.");
        } catch {
            toast.error("No se pudo copiar el enlace.");
        }
    };

    const cerrarEnlaces = () => {
        setOpenEnlaces(false);
        setOpEnlaces(null);
        setEnlaces([]);
        setLoadingEnlaces(false);
    };

    const abrirEnlaceGrupo = (op: Operacion, grupo: OperacionConteoGrupo) => {
        const conteoId = Number(grupo?.conteoId ?? grupo?.id);
        if (!Number.isFinite(conteoId) || conteoId <= 0) {
            toast.error("No se pudo generar el enlace del grupo.");
            return;
        }
        const grupoId = Number(grupo?.grupoId);
        const nombre = grupo?.grupo ?? `Grupo ${grupoId || conteoId}`;
        setOpenEnlaces(true);
        setOpEnlaces(op);
        setLoadingEnlaces(false);
        setEnlaces([
            {
                grupoId: conteoId,
                nombre,
                url: `${origin}/conteo/${conteoId}`,
            },
        ]);
    };

    const openEliminarConteo = (conteoId: number, operacionId: number, numeroConteo: number, grupoNombre: string) => {
        setConteoAEliminar({ conteoId, operacionId, numeroConteo, grupoNombre });
        setConfirmEliminarOpen(true);
    };

    const confirmarEliminarConteo = async () => {
        if (!conteoAEliminar) return;
        const conteoId = conteoAEliminar.conteoId;
        setEliminandoByConteoId((p) => ({ ...p, [conteoId]: true }));
        try {
            await eliminarConteo(conteoId);
            toast.success("Conteo eliminado correctamente.");
            onConteoEliminado?.();
        } catch (error: any) {
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo eliminar el conteo.";
            toast.error(String(msg));
        } finally {
            setEliminandoByConteoId((p) => ({ ...p, [conteoId]: false }));
            setConfirmEliminarOpen(false);
            setConteoAEliminar(null);
        }
    };

    return (
        <>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Operaciones registradas</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500 text-center">Cargando operaciones...</p>
                    ) : ops.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center">No hay operaciones registradas.</p>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-end">
                                <span className="text-xs text-slate-500">
                                    {ops.length} operación{ops.length !== 1 ? "es" : ""}
                                </span>
                            </div>

                            {ops.map((op) => {
                                const avanceRaw = op.porcentaje ?? 0;
                                const avanceNum = Number(avanceRaw);
                                const avance = Math.max(
                                    0,
                                    Math.min(100, Number.isFinite(avanceNum) ? avanceNum : 0)
                                );
                                const conteosByNumero = new Map<number, OperacionConteoGrupo[]>();
                                if (Array.isArray(op.conteos)) {
                                    for (const c of op.conteos) {
                                        const numeroBase = Number(c?.numeroConteo) || 0;
                                        const grupos = Array.isArray(c?.grupos) ? c.grupos : [];
                                        for (const g of grupos) {
                                            const numero = Number(g?.numeroConteo ?? numeroBase) || numeroBase;
                                            if (!numero) continue;
                                            const prev = conteosByNumero.get(numero) ?? [];
                                            prev.push(g);
                                            conteosByNumero.set(numero, prev);
                                        }
                                    }
                                }
                                const maxConteoFallback = Number.isFinite(Number(op.numeroConteo))
                                    ? Math.max(1, Math.min(3, Number(op.numeroConteo)))
                                    : 1;
                                const conteosFromApi = Array.isArray(op.conteos)
                                    ? op.conteos.flatMap((c) => {
                                          const direct = Number(c?.numeroConteo);
                                          const nested = Array.isArray(c?.grupos)
                                              ? c.grupos.map((g) => Number(g?.numeroConteo))
                                              : [];
                                          return [direct, ...nested];
                                      })
                                      .filter((n) => Number.isFinite(n) && n > 0)
                                    : [];
                                const conteos = conteosFromApi.length > 0
                                    ? Array.from(new Set(conteosFromApi)).sort((a, b) => a - b)
                                    : Array.from({ length: maxConteoFallback }, (_, i) => i + 1);
                                const maxConteo = conteos.length > 0 ? Math.max(...conteos) : maxConteoFallback;

                                return (
                                    <section key={op.id} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-semibold text-slate-800">Operación {op.id}</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">
                                                    {conteos.length} conteo{conteos.length !== 1 ? "s" : ""}
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-3 text-xs"
                                                    onClick={() => onAgregarConteo(op)}
                                                    disabled={op.estado === "CERRADA"}
                                                >
                                                    Agregar conteo
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="text-[11px] text-slate-500">Conteos de la operación</div>
                                            <div className="space-y-2">
                                                {conteos.map((c) => {
                                                    const gruposConteo = conteosByNumero.get(c) ?? [];

                                                    return (
                                                        <div
                                                            key={`${op.id}-${c}`}
                                                            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                                                        >
                                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto">
                                                                        <div className="text-xs font-semibold text-slate-800">
                                                                            Conteo {c}
                                                                        </div>
                                                                        <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-700">
                                                                            Op: {op.estado}
                                                                        </span>
                                                                    </div>
                                                                    <div className="mt-1 flex flex-nowrap items-center gap-2 overflow-x-auto">
                                                                        <div className="h-2 w-28 shrink-0 rounded-full bg-slate-200 overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-emerald-500"
                                                                                style={{ width: `${avance}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="shrink-0 text-[11px] text-slate-600">
                                                                            {avance}%
                                                                        </span>
                                                                        <div className="ml-2 flex flex-nowrap items-center gap-1.5 shrink-0">
                                                                            <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                                                                Bodega {op.bodega}
                                                                            </span>
                                                                            <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                                                                {formatearFecha(op.fecha)}
                                                                            </span>
                                                                            <span className="inline-flex shrink-0 items-center rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                                                                                {op.usuarioCreacion}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex gap-2 flex-wrap sm:justify-end">
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-7 px-2 text-[11px]"
                                                                        onClick={() => onCerrar(op.id)}
                                                                        disabled={op.estado === "CERRADA"}
                                                                    >
                                                                        Cerrar operación
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        className="h-7 px-2 text-[11px]"
                                                                        onClick={() => onEliminar(op.id)}
                                                                    >
                                                                        Eliminar operación
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            {gruposConteo.length > 0 ? (
                                                                <div className="mt-2 space-y-1">
                                                                    <div className="text-[11px] text-slate-500">
                                                                        Grupos del conteo
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {gruposConteo.map((g) => {
                                                                            const conteoId = Number(g?.conteoId ?? g?.id);
                                                                            const grupoNombre =
                                                                                (g as any)?.grupo ?? (g as any)?.grupoNombre ?? `Grupo ${g?.grupoId}`;
                                                                            const estadoGrupo = String(g?.estado ?? "").trim().toUpperCase();
                                                                            const disabled = !Number.isFinite(conteoId);
                                                                            const grupoId = Number(g?.grupoId);
                                                                            const grupoAvanceRaw = g?.porcentajes?.porcentaje ?? 0;
                                                                            const grupoAvanceNum = Number(grupoAvanceRaw);
                                                                            const grupoAvance = Math.max(
                                                                                0,
                                                                                Math.min(100, Number.isFinite(grupoAvanceNum) ? grupoAvanceNum : 0)
                                                                            );
                                                                            const grupoTotal = Number(g?.porcentajes?.totalItems);
                                                                            const grupoContados = Number(g?.porcentajes?.itemsContados);
                                                                            const mostrarConteo =
                                                                                Number.isFinite(grupoTotal) &&
                                                                                grupoTotal > 0 &&
                                                                                Number.isFinite(grupoContados) &&
                                                                                grupoContados >= 0;

                                                                            return (
                                                                                <div
                                                                                    key={`${c}-${g?.grupoId}-${conteoId || "na"}`}
                                                                                    className="grid grid-cols-1 gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                                                                                >
                                                                                    <div className="min-w-0">
                                                                                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                                                                            <span className="font-semibold text-slate-900 leading-none">{grupoNombre}</span>
                                                                                            {Number.isFinite(conteoId) ? (
                                                                                                <span className="text-xs text-slate-400 leading-none">#{conteoId}</span>
                                                                                            ) : null}
                                                                                            {Number.isFinite(grupoId) ? (
                                                                                                <span className="text-xs text-slate-300 leading-none">(grupo {grupoId})</span>
                                                                                            ) : null}
                                                                                            {estadoGrupo ? (
                                                                                                <span className="ml-1 inline-flex h-6 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] text-slate-700">
                                                                                                    {estadoGrupo}
                                                                                                </span>
                                                                                            ) : null}
                                                                                        </div>

                                                                                        {g?.porcentajes ? (
                                                                                            <div className="mt-1 flex flex-nowrap items-center gap-2">
                                                                                                <div className="h-2 w-24 shrink-0 rounded-full bg-slate-200 overflow-hidden">
                                                                                                    <div
                                                                                                        className="h-full bg-emerald-500"
                                                                                                        style={{ width: `${grupoAvance}%` }}
                                                                                                    />
                                                                                                </div>
                                                                                                <span className="shrink-0 text-[11px] text-slate-600">
                                                                                                    {grupoAvance}%
                                                                                                </span>
                                                                                                {mostrarConteo ? (
                                                                                                    <span className="shrink-0 text-[11px] text-slate-500">
                                                                                                        {grupoContados}/{grupoTotal}
                                                                                                    </span>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        ) : null}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 sm:justify-end">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="secondary"
                                                                                            className="h-8 px-3 text-xs"
                                                                                            onClick={() => abrirEnlaceGrupo(op, g)}
                                                                                        >
                                                                                            Enlace
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="destructive"
                                                                                            className="h-8 px-3 text-xs"
                                                                                            onClick={() =>
                                                                                                openEliminarConteo(
                                                                                                    conteoId,
                                                                                                    op.id,
                                                                                                    c,
                                                                                                    grupoNombre
                                                                                                )
                                                                                            }
                                                                                            disabled={
                                                                                                disabled ||
                                                                                                !!eliminandoByConteoId[conteoId]
                                                                                            }
                                                                                        >
                                                                                            {eliminandoByConteoId[conteoId]
                                                                                                ? "Eliminando..."
                                                                                                : "Eliminar conteo"}
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                    </section>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={openEnlaces}
                onOpenChange={(v) => {
                    if (!v) cerrarEnlaces();
                }}
            >
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogDescription>
                            {opEnlaces
                                ? `Operación ${opEnlaces.id} · Bodega ${opEnlaces.bodega} · Conteo ${opEnlaces.numeroConteo}`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {loadingEnlaces ? (
                            <p className="text-sm text-slate-500 text-center">Cargando enlaces...</p>
                        ) : enlaces.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center">
                                No hay grupos asociados para generar enlaces.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {enlaces.map((e) => (
                                    <div
                                        key={e.grupoId}
                                        className="flex flex-col gap-2 rounded-lg border bg-white p-3 md:flex-row md:items-center"
                                    >
                                        <div className="min-w-[180px] text-sm font-medium text-slate-800">
                                            {e.nombre}
                                        </div>

                                        <Input readOnly value={e.url} className="font-mono text-xs" />

                                        <div className="flex gap-2 md:justify-end">
                                            <Button
                                                size="sm"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => copiar(e.url)}
                                            >
                                                Copiar
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="h-8 px-3 text-xs"
                                                onClick={() => window.open(e.url, "_blank")}
                                            >
                                                Abrir
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={confirmEliminarOpen}
                onOpenChange={(v) => {
                    if (!v) {
                        setConfirmEliminarOpen(false);
                        setConteoAEliminar(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogDescription>
                            ¿Eliminar este conteo individual? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    {conteoAEliminar ? (
                        <div className="text-sm text-slate-700 space-y-1">
                            <div>
                                <span className="font-medium">Operación:</span> {conteoAEliminar.operacionId}
                            </div>
                            <div>
                                <span className="font-medium">Grupo:</span> {conteoAEliminar.grupoNombre}
                            </div>
                            <div>
                                <span className="font-medium">Conteo:</span> {conteoAEliminar.numeroConteo}
                            </div>
                        </div>
                    ) : null}

                    <div className="mt-4 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setConfirmEliminarOpen(false);
                                setConteoAEliminar(null);
                            }}
                            disabled={
                                conteoAEliminar ? !!eliminandoByConteoId[conteoAEliminar.conteoId] : false
                            }
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmarEliminarConteo}
                            disabled={
                                conteoAEliminar ? !!eliminandoByConteoId[conteoAEliminar.conteoId] : false
                            }
                        >
                            {conteoAEliminar && eliminandoByConteoId[conteoAEliminar.conteoId]
                                ? "Eliminando..."
                                : "Eliminar conteo"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default OperacionesTable;








