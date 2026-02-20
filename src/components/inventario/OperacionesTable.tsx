import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { Operacion, obtenerAvanceOperacion } from "@/services/inventarioService";
import { GrupoConteo, getGruposPorOperacion } from "@/services/grupoConteoService";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
                              onVerGrupos,
                          }: OperacionesTableProps) => {
    const ops = Array.isArray(operaciones) ? operaciones : [];

    const gruposPorConteo: Record<number, Operacion[]> = {};
    for (const op of ops) {
        const conteo = op.numeroConteo ?? 1;
        if (!gruposPorConteo[conteo]) gruposPorConteo[conteo] = [];
        gruposPorConteo[conteo].push(op);
    }

    const conteosOrdenados = Object.keys(gruposPorConteo)
        .map((n) => Number(n))
        .sort((a, b) => a - b);

    const [openEnlaces, setOpenEnlaces] = useState(false);
    const [opEnlaces, setOpEnlaces] = useState<Operacion | null>(null);
    const [loadingEnlaces, setLoadingEnlaces] = useState(false);
    const [enlaces, setEnlaces] = useState<EnlaceGrupo[]>([]);

    const [avancePorOperacion, setAvancePorOperacion] = useState<Record<number, number>>({});
    const avanceKeyRef = useRef<string>("");

    const origin = useMemo(() => {
        const fromEnv = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
        const fromStorage = localStorage.getItem("PUBLIC_APP_URL");
        const raw = fromEnv || fromStorage || window.location.origin;
        return String(raw).replace(/\/+$/, "");
    }, []);

    useEffect(() => {
        if (loading) return;
        if (!ops.length) {
            setAvancePorOperacion({});
            avanceKeyRef.current = "";
            return;
        }

        const ids = ops
            .map((o) => o.id)
            .filter((id) => Number.isFinite(id) && id > 0)
            .sort((a, b) => a - b);
        const key = ids.join("|");
        if (key === avanceKeyRef.current) return;
        avanceKeyRef.current = key;

        let cancelado = false;

        (async () => {
            try {
                const resultados = await Promise.all(
                    ids.map(async (id) => {
                        try {
                            const r = await obtenerAvanceOperacion(id);
                            return [id, r.data?.porcentaje ?? 0] as const;
                        } catch {
                            return [id, 0] as const;
                        }
                    })
                );

                if (cancelado) return;

                const map: Record<number, number> = {};
                for (const [id, porcentaje] of resultados) map[id] = porcentaje;

                setAvancePorOperacion(map);
            } catch {
                if (!cancelado) toast.error("No se pudo cargar el avance.");
            }
        })();

        return () => {
            cancelado = true;
        };
    }, [loading, operaciones]);

    const copiar = async (texto: string) => {
        try {
            await navigator.clipboard.writeText(texto);
            toast.success("Enlace copiado.");
        } catch {
            toast.error("No se pudo copiar el enlace.");
        }
    };

    const abrirEnlaces = async (op: Operacion) => {
        setOpenEnlaces(true);
        setOpEnlaces(op);
        setEnlaces([]);
        setLoadingEnlaces(true);

        try {
            const grupos: GrupoConteo[] = await getGruposPorOperacion(op.id);
            const lista: EnlaceGrupo[] = (Array.isArray(grupos) ? grupos : []).map((g) => ({
                grupoId: g.id,
                nombre: g.nombre || `Grupo ${g.id}`,
                url: `${origin}/conteo/${op.id}/${g.id}`,
            }));
            setEnlaces(lista);
        } catch {
            setEnlaces([]);
            toast.error("No se pudieron cargar los grupos para generar enlaces.");
        } finally {
            setLoadingEnlaces(false);
        }
    };

    const cerrarEnlaces = () => {
        setOpenEnlaces(false);
        setOpEnlaces(null);
        setEnlaces([]);
        setLoadingEnlaces(false);
    };

    return (
        <>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Operaciones registradas</CardTitle>
                </CardHeader>

                <CardContent>
                    {loading ? (
                        <p className="text-sm text-slate-500 text-center">Cargando operaciones…</p>
                    ) : ops.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center">No hay operaciones registradas.</p>
                    ) : (
                        <div className="space-y-8">
                            {conteosOrdenados.map((conteo) => {
                                const lista = gruposPorConteo[conteo] || [];

                                return (
                                    <section key={conteo} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h2 className="text-sm font-semibold text-slate-800">
                                                Conteo {conteo}
                                            </h2>
                                            <span className="text-xs text-slate-500">
                                                {lista.length} operación{lista.length !== 1 ? "es" : ""}
                                            </span>
                                        </div>

                                        <div className="rounded-md border border-slate-200 overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-slate-50">
                                                    <TableRow>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            ID
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Bodega
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Fecha
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Estado
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Usuario
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Avance
                                                        </TableHead>
                                                        <TableHead className="text-center text-xs font-medium text-slate-600">
                                                            Acciones
                                                        </TableHead>
                                                    </TableRow>
                                                </TableHeader>

                                                <TableBody>
                                                    {lista.map((op) => {
                                                        const avanceRaw =
                                                            avancePorOperacion[op.id] ??
                                                            op.porcentajeAvance ??
                                                            0;

                                                        const avance = Math.max(
                                                            0,
                                                            Math.min(
                                                                100,
                                                                Number.isFinite(avanceRaw) ? avanceRaw : 0
                                                            )
                                                        );

                                                        return (
                                                            <TableRow key={op.id} className="hover:bg-slate-50">
                                                                <TableCell className="text-center text-sm text-slate-700">
                                                                    {op.id}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-700">
                                                                    {op.bodega}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-700">
                                                                    {formatearFecha(op.fecha)}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-700">
                                                                    {op.estado}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-700">
                                                                    {op.usuarioCreacion}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                                                                            <div
                                                                                className="h-full bg-emerald-500"
                                                                                style={{ width: `${avance}%` }}
                                                                            />
                                                                        </div>
                                                                        <span className="text-[11px] text-slate-600">
                                                                            {avance}%
                                                                        </span>
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <div className="flex gap-2 justify-center flex-wrap">
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs"
                                                                            onClick={() => onVerGrupos(op)}
                                                                        >
                                                                            Grupos
                                                                        </Button>
                                                                        <Button
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs"
                                                                            onClick={() => onCerrar(op.id)}
                                                                            disabled={op.estado === "CERRADA"}
                                                                        >
                                                                            Cerrar
                                                                        </Button>
                                                                        <Button
                                                                            variant="destructive"
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs"
                                                                            onClick={() => onEliminar(op.id)}
                                                                        >
                                                                            Eliminar
                                                                        </Button>
                                                                        <Button
                                                                            variant="secondary"
                                                                            size="sm"
                                                                            className="h-8 px-3 text-xs"
                                                                            onClick={() => abrirEnlaces(op)}
                                                                        >
                                                                            Enlaces
                                                                        </Button>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
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
                            <p className="text-sm text-slate-500 text-center">Cargando enlaces…</p>
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
        </>
    );
};

export default OperacionesTable;
