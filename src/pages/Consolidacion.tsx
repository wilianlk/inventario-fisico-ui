import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    generarDI81,
    obtenerConteosFinalizados,
    cerrarConsolidacion,
} from "@/services/consolidacionService";
import { Button } from "@/components/ui/button";
import ConsolidacionFilters from "@/components/consolidacion/ConsolidacionFilters";
import ConsolidacionTable from "@/components/consolidacion/ConsolidacionTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { applyFilters, buildConsolidado } from "@/hooks/consolidacion.logic";
import type { ConsolidacionFilters as FType, BackendConsolidadoItem } from "@/hooks/consolidacion.logic";
import { parseConteosFinalizadosPayload } from "@/hooks/consolidacion.payload";
import type { BackendConteosFinalizadosPayload } from "@/hooks/consolidacion.payload";

type ApiErrorBody = {
    mensaje?: unknown;
    detail?: unknown;
    title?: unknown;
    errors?: Record<string, unknown>;
};

type ApiErrorLike = {
    response?: { data?: unknown };
    message?: unknown;
};

type HeadersLike = Record<string, string | undefined>;

type OperacionLike = {
    operacionId?: unknown;
    OperacionId?: unknown;
};

type FinalizarModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

const FinalizarModal = ({ open, loading, onClose, onConfirm }: FinalizarModalProps) => {
    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (loading) return;
                if (!nextOpen) onClose();
            }}
        >
            <DialogContent className="max-w-md [&>button]:hidden">
                <DialogHeader className="space-y-1">
                    <DialogTitle className="text-base font-semibold text-slate-900">Confirmar finalización</DialogTitle>
                    <DialogDescription className="text-sm text-slate-600">
                        ¿Está seguro de finalizar el inventario? Esta acción no se puede deshacer.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-md border text-sm disabled:opacity-60"
                        disabled={loading}
                        onClick={onClose}
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                        disabled={loading}
                        onClick={() => void onConfirm()}
                    >
                        {loading ? "Finalizando..." : "Confirmar"}
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const toPositiveInt = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const out = Number(value);
    if (!Number.isFinite(out)) return null;
    const normalized = Math.trunc(out);
    return normalized > 0 ? normalized : null;
};

const Consolidacion = () => {
    const [items, setItems] = useState<BackendConsolidadoItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [detalleOpen, setDetalleOpen] = useState(false);

    const [filters, setFilters] = useState<FType>({
        operacionId: "",
        grupo: "",
        etiqueta: "",
        codigoItem: "",
        descripcion: "",
        udm: "",
        ubicacion: "",
        lote: "",
        soloOk: false,
        soloRecontar: false,
    });

    const [openFinalizar, setOpenFinalizar] = useState(false);
    const [finalizando, setFinalizando] = useState(false);

    const [finalizadasPorOperacion, setFinalizadasPorOperacion] = useState<Record<number, boolean>>({});
    const [estadoTextoPorOperacion, setEstadoTextoPorOperacion] = useState<Record<number, string>>({});
    const [validandoEstado, setValidandoEstado] = useState(false);

    const didInit = useRef(false);
    const finalizadaRef = useRef(false);

    const errorMsg = (err: unknown, fallback: string) => {
        const e = err as ApiErrorLike;
        const data = e?.response?.data;
        const body = typeof data === "object" && data !== null ? (data as ApiErrorBody) : null;

        if (typeof data === "string" && data.trim()) return data;
        if (body?.mensaje) return String(body.mensaje);

        if (body?.detail) return String(body.detail);
        if (body?.title) return String(body.title);

        const errors = body?.errors;
        if (errors && typeof errors === "object") {
            const firstKey = Object.keys(errors)[0];
            const firstVal = firstKey ? errors[firstKey] : null;
            if (Array.isArray(firstVal) && firstVal.length > 0) return String(firstVal[0]);
        }

        if (e?.message) return String(e.message);
        return fallback;
    };

    const getOperacionIdsFromItems = (arr: OperacionLike[]): number[] => {
        const ids = new Set<number>();
        for (const x of arr ?? []) {
            const n = toPositiveInt(x?.operacionId ?? x?.OperacionId);
            if (n !== null) ids.add(n);
        }
        return Array.from(ids);
    };

    const descargarBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const nombreDesdeHeaders = (headers: HeadersLike | undefined, fallback: string) => {
        const cd = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
        const match = String(cd).match(/filename="?([^"]+)"?/i);
        return match?.[1] || fallback;
    };

    const baseRows = useMemo(() => buildConsolidado(items), [items]);

    const operacionesLista = useMemo<number[]>(() => {
        const set = new Set<number>();

        for (const row of baseRows) {
            if (row.operacionId === null) continue;
            set.add(row.operacionId);
        }

        return Array.from(set).sort((a, b) => a - b);
    }, [baseRows]);

    const operacionSeleccionada = useMemo(() => toPositiveInt(filters.operacionId), [filters.operacionId]);

    const operacionIdsObjetivo = useMemo(() => {
        if (operacionSeleccionada !== null) {
            const existe = operacionesLista.includes(operacionSeleccionada);
            return existe ? [operacionSeleccionada] : [];
        }

        if (operacionesLista.length === 1) return [operacionesLista[0]];
        return [];
    }, [operacionSeleccionada, operacionesLista]);

    const finalizada = useMemo(() => {
        if (!operacionIdsObjetivo.length) return false;
        return operacionIdsObjetivo.every((id) => finalizadasPorOperacion[id] === true);
    }, [operacionIdsObjetivo, finalizadasPorOperacion]);

    useEffect(() => {
        finalizadaRef.current = finalizada;
    }, [finalizada]);

    const cargar = async () => {
        setLoading(true);
        try {
            const resp = await obtenerConteosFinalizados();
            const { items: next, estadoPorOperacion, estadoTextoPorOperacion } = parseConteosFinalizadosPayload(
                resp.data as BackendConteosFinalizadosPayload
            );

            if (finalizadaRef.current && next.length === 0 && items.length > 0) {
                toast.info("La consolidación está finalizada. Se mantiene el snapshot en pantalla.");
                return;
            }

            setItems(next);

            const ids = getOperacionIdsFromItems(next).sort((a, b) => a - b);
            if (ids.length >= 1) {
                if (Object.keys(estadoPorOperacion).length > 0) {
                    setFinalizadasPorOperacion(estadoPorOperacion);
                } else {
                    const estadoFallback: Record<number, boolean> = {};
                    for (const id of ids) estadoFallback[id] = false;
                    setFinalizadasPorOperacion(estadoFallback);
                }
            } else {
                setFinalizadasPorOperacion({});
            }

            setEstadoTextoPorOperacion(estadoTextoPorOperacion);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo cargar la consolidación.");
            if (!finalizadaRef.current) setItems([]);
            if (!finalizadaRef.current) setFinalizadasPorOperacion({});
            if (!finalizadaRef.current) setEstadoTextoPorOperacion({});
        } finally {
            setLoading(false);
            setValidandoEstado(false);
        }
    };

    useEffect(() => {
        if (didInit.current) return;
        didInit.current = true;
        void cargar();
    }, []);

    const rows = useMemo(() => applyFilters(baseRows, filters), [baseRows, filters]);

    const resumen = useMemo(() => {
        let ok = 0;
        let recontar = 0;
        for (const r of rows) {
            if (r.reconteoTexto === "OK !") ok++;
            else if (r.reconteoTexto === "Recontar") recontar++;
        }
        return { filas: rows.length, ok, recontar };
    }, [rows]);

    const limpiar = () => {
        setFilters({
            operacionId: "",
            grupo: "",
            etiqueta: "",
            codigoItem: "",
            descripcion: "",
            udm: "",
            ubicacion: "",
            lote: "",
            soloOk: false,
            soloRecontar: false,
        });
    };

    const seleccionarOperacion = (operacionId: number | null) => {
        setFilters((prev) => ({
            ...prev,
            operacionId: operacionId === null ? "" : String(operacionId),
        }));
    };

    const verConsolidacion = (operacionId: number | null) => {
        seleccionarOperacion(operacionId);
        setDetalleOpen(true);
    };

    const finalizar = async () => {
        const operacionIds = operacionIdsObjetivo;

        if (operacionIds.length === 0) {
            toast.error("No hay operación cargada para finalizar.");
            return;
        }

        try {
            setFinalizando(true);

            for (const operacionId of operacionIds) {
                await cerrarConsolidacion(operacionId);
            }

            setFinalizadasPorOperacion((prev) => {
                const next = { ...prev };
                for (const operacionId of operacionIds) next[operacionId] = true;
                return next;
            });

            if (operacionIds.length === 1) {
                toast.success(`Operación ${operacionIds[0]} y consolidación finalizadas.`);
            } else {
                toast.success("Operaciones y consolidación finalizadas.");
            }
            setOpenFinalizar(false);
        } catch (e) {
            toast.error(errorMsg(e, "No se pudo finalizar la consolidación."));
        } finally {
            setFinalizando(false);
        }
    };

    const generarArchivo = async () => {
        const operacionIds = operacionIdsObjetivo;

        if (operacionIds.length === 0) {
            toast.error("No hay operación cargada.");
            return;
        }

        if (!finalizada) {
            toast.error("La consolidación no está FINALIZADA para las operaciones seleccionadas.");
            return;
        }

        try {
            for (const operacionId of operacionIds) {
                const resp = await generarDI81(operacionId);
                const filename = nombreDesdeHeaders(resp.headers as HeadersLike, `DI81_${operacionId}.txt`);
                descargarBlob(resp.data, filename);
            }
        } catch (e) {
            toast.error(errorMsg(e, "No se pudo generar el archivo."));
        }
    };

    return (
        <section className="space-y-6">
            <header className="space-y-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Consolidación</h1>
                    <p className="text-xs sm:text-sm text-slate-600"></p>
                </div>
            </header>

            <div className="rounded-xl border bg-white shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-3 sm:px-4 py-3 border-b">
                    <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-slate-900">Operaciones</div>
                        <div className="text-xs text-slate-600">
                            Selecciona una operación y haz clic en <b>Ver</b> para mostrar la consolidación.
                        </div>
                    </div>
                </div>

                {operacionesLista.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-[11px] sm:text-xs">Operación</TableHead>
                                <TableHead className="text-[11px] sm:text-xs">Estado</TableHead>
                                <TableHead className="text-[11px] sm:text-xs text-right">Acción</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {operacionesLista.map((op) => {
                                        const opFinalizada = finalizadasPorOperacion[op] === true;
                                        const opEstadoTexto = (estadoTextoPorOperacion[op] ?? "").trim();
                                        const opEstadoNorm = opEstadoTexto.toUpperCase();
                                        const selected =
                                            operacionSeleccionada === op ||
                                            (operacionSeleccionada === null && operacionesLista.length === 1);

                                        const badge = (() => {
                                            if (opFinalizada || opEstadoNorm === "FINALIZADA") {
                                                return {
                                                    text: opEstadoTexto || "FINALIZADA",
                                                    className:
                                                        "inline-flex rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold",
                                                };
                                            }

                                            if (opEstadoNorm === "CONSOLIDADA") {
                                                return {
                                                    text: opEstadoTexto,
                                                    className:
                                                        "inline-flex rounded-full bg-sky-100 text-sky-800 px-2 py-0.5 text-[10px] font-semibold",
                                                };
                                            }

                                            return {
                                                text: opEstadoTexto || "PENDIENTE",
                                                className:
                                                    "inline-flex rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-semibold",
                                            };
                                        })();

                                        return (
                                            <TableRow
                                                key={op}
                                                className="cursor-pointer"
                                                data-state={selected ? "selected" : undefined}
                                                onClick={() => verConsolidacion(op)}
                                            >
                                                <TableCell className="text-xs sm:text-sm font-medium">
                                                    {op}
                                                </TableCell>

                                                <TableCell className="text-xs sm:text-sm">
                                                    <span className={badge.className}>{badge.text}</span>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={selected ? "default" : "outline"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            verConsolidacion(op);
                                                        }}
                                                    >
                                                        Ver
                                                    </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="px-3 sm:px-4 py-8 text-center text-sm text-slate-500">
                        No hay operaciones disponibles.
                    </div>
                )}
            </div>

            <Dialog open={detalleOpen} onOpenChange={setDetalleOpen}>
                <DialogContent className="w-[98vw] max-w-[1700px] max-h-[92vh] p-0 overflow-hidden">
                        <div className="flex flex-col max-h-[92vh]">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b p-4 pr-12">
                                <DialogHeader className="space-y-1">
                                    <DialogTitle className="text-base sm:text-lg">Detalle de consolidación</DialogTitle>
                                    <DialogDescription className="text-xs text-slate-600">
                                        {operacionSeleccionada === null ? "Operación" : `Operación ${operacionSeleccionada}`}
                                    </DialogDescription>
                                </DialogHeader>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => {
                                        const ids = operacionIdsObjetivo;
                                        if (ids.length === 0) {
                                            toast.error("No hay operación cargada.");
                                            return;
                                        }

                                        if (finalizada) {
                                            void generarArchivo();
                                        } else {
                                            setOpenFinalizar(true);
                                        }
                                    }}
                                    disabled={loading || finalizando || validandoEstado}
                                >
                                    {validandoEstado
                                        ? "Validando..."
                                        : finalizada
                                          ? "Generar archivo"
                                          : "Finalizar operación"}
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <ConsolidacionFilters
                                value={filters}
                                onChange={setFilters}
                                onClear={limpiar}
                                resumen={resumen}
                            />

                            <ConsolidacionTable rows={rows} fullBleed={false} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <FinalizarModal
                open={openFinalizar}
                loading={finalizando}
                onClose={() => setOpenFinalizar(false)}
                onConfirm={finalizar}
            />
        </section>
    );
};

export default Consolidacion;
