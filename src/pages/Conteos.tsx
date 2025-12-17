import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import ConteoTable, { SearchFilters } from "@/components/conteos/ConteoTable";
import UbicacionPickerModal from "@/components/conteos/UbicacionPickerModal";
import { useConteoScan } from "@/hooks/useConteoScan";

import {
    obtenerConteoActual,
    actualizarCantidadContada,
    finalizarConteo,
    ItemConteo,
    DetalleConteo,
} from "@/services/conteoService";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";

const Conteos = () => {
    const [detalles, setDetalles] = useState<DetalleConteo[]>([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const [scanValue, setScanValue] = useState("");
    const scanValueRef = useRef("");

    const [busqueda, setBusqueda] = useState<SearchFilters>({
        etiqueta: "",
        codigoItem: "",
        descripcion: "",
        lote: "",
        ubicacion: "",
    });

    const [finalizandoByConteoId, setFinalizandoByConteoId] = useState<Record<number, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmDetalle, setConfirmDetalle] = useState<DetalleConteo | null>(null);

    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const didLoadRef = useRef(false);
    const scanTimerRef = useRef<number | null>(null);

    const qtyByIdRef = useRef<Record<number, number>>({});
    const confirmedByIdRef = useRef<Record<number, number>>({});
    const queueByIdRef = useRef<Record<number, Promise<void>>>({});

    const estadoByDetalleKey = useMemo(() => {
        const map: Record<string, string> = {};
        for (const d of detalles) {
            const key = `${d.operacionId}-${d.grupoId}-${d.numeroConteo}`;
            map[key] = d.estadoConteo ? String(d.estadoConteo).toUpperCase() : "";
        }
        return map;
    }, [detalles]);

    const editableDetalle = (d: DetalleConteo) => {
        const key = `${d.operacionId}-${d.grupoId}-${d.numeroConteo}`;
        const st = estadoByDetalleKey[key];
        if (!st) return true;
        return st === "ABIERTO";
    };

    const detalleKeyByItemId = useMemo(() => {
        const map: Record<number, string> = {};
        for (const d of detalles) {
            const key = `${d.operacionId}-${d.grupoId}-${d.numeroConteo}`;
            for (const it of d.items) map[it.id] = key;
        }
        return map;
    }, [detalles]);

    const editableItemId = (itemId: number) => {
        const key = detalleKeyByItemId[itemId];
        if (!key) return true;
        const st = estadoByDetalleKey[key];
        if (!st) return true;
        return st === "ABIERTO";
    };

    const hayAlgunoEditable = useMemo(() => {
        if (detalles.length === 0) return true;
        return detalles.some((d) => editableDetalle(d));
    }, [detalles, estadoByDetalleKey]);

    const rebuildQtyRefs = (lista: DetalleConteo[]) => {
        const map: Record<number, number> = {};
        for (const det of lista) for (const it of det.items) map[it.id] = it.cantidadContada ?? 0;
        qtyByIdRef.current = map;
        confirmedByIdRef.current = { ...map };
    };

    const setLocalCantidad = (itemId: number, cantidad: number) => {
        qtyByIdRef.current[itemId] = cantidad;
        setDetalles((prev) =>
            prev.map((det) => ({
                ...det,
                items: det.items.map((it) => (it.id === itemId ? { ...it, cantidadContada: cantidad } : it)),
            }))
        );
    };

    const enqueuePersist = (itemId: number, cantidad: number) => {
        const prev = queueByIdRef.current[itemId] ?? Promise.resolve();
        const next = prev
            .catch(() => undefined)
            .then(async () => {
                await actualizarCantidadContada(itemId, cantidad);
                confirmedByIdRef.current[itemId] = cantidad;
            });
        queueByIdRef.current[itemId] = next;
        return next;
    };

    const cargarConteoActual = async () => {
        setLoadingDetalle(true);
        setLoadingItems(true);
        try {
            const resp = await obtenerConteoActual();
            const lista = resp.data ?? [];
            setDetalles(lista);
            rebuildQtyRefs(lista);
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cargar el conteo actual.");
            setDetalles([]);
            qtyByIdRef.current = {};
            confirmedByIdRef.current = {};
        } finally {
            setLoadingDetalle(false);
            setLoadingItems(false);
        }
    };

    const guardarCantidadAbsoluta = async (itemId: number, cantidad: number) => {
        if (!editableItemId(itemId)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }

        const n = Number(cantidad);
        const nueva = Number.isFinite(n) ? Math.max(0, n) : 0;

        const prevConfirm = confirmedByIdRef.current[itemId] ?? 0;
        setLocalCantidad(itemId, nueva);

        try {
            await enqueuePersist(itemId, nueva);
            toast.success("Cantidad contada guardada.");
        } catch (error: any) {
            console.error(error);
            setLocalCantidad(itemId, prevConfirm);
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo guardar la cantidad contada.";
            toast.error(String(msg));
            throw error;
        }
    };

    const sumarCantidad = async (itemId: number, delta: number) => {
        if (!editableItemId(itemId)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }

        const d = Number(delta);
        if (!Number.isFinite(d) || d <= 0) return;

        const actual = qtyByIdRef.current[itemId] ?? 0;
        const nueva = Math.max(0, actual + d);

        const prevConfirm = confirmedByIdRef.current[itemId] ?? 0;
        setLocalCantidad(itemId, nueva);

        try {
            await enqueuePersist(itemId, nueva);
        } catch (error: any) {
            console.error(error);
            setLocalCantidad(itemId, prevConfirm);
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                error?.response?.data?.error ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo guardar la cantidad contada.";
            toast.error(String(msg));
            throw error;
        }
    };

    const resetBusquedaManual = () => {
        setBusqueda({ etiqueta: "", codigoItem: "", descripcion: "", lote: "", ubicacion: "" });
    };

    const scan = useConteoScan({
        detalles,
        onSumarCantidad: sumarCantidad,
        onSelectItem: setSelectedItemId,
        onResetBusquedaManual: resetBusquedaManual,
    });

    const limpiarFiltros = () => {
        setSelectedItemId(null);
        resetBusquedaManual();
    };

    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;
        cargarConteoActual();
    }, []);

    useEffect(() => {
        if (!hayAlgunoEditable) return;
        scanInputRef.current?.focus();
    }, [detalles.length, hayAlgunoEditable]);

    const procesarScan = async (raw: string) => {
        if (!hayAlgunoEditable) {
            toast.info("No hay conteos abiertos. Solo lectura.");
            scanValueRef.current = "";
            setScanValue("");
            return;
        }

        const code = (raw || "").trim();
        if (!code) return;

        try {
            const r = await scan.procesarCodigo(code, 1);
            if (r?.info) toast.info(r.info);
            if (r?.warn) toast.warn(r.warn);
            if (r?.error) toast.error(r.error);
        } catch (e: any) {
            toast.error(e?.message ?? "Error procesando el código.");
        } finally {
            scanValueRef.current = "";
            setScanValue("");
            scanInputRef.current?.focus();
        }
    };

    useEffect(() => {
        if (!hayAlgunoEditable) {
            if (scanTimerRef.current) {
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = null;
            }
            return;
        }

        if (scanTimerRef.current) {
            window.clearTimeout(scanTimerRef.current);
            scanTimerRef.current = null;
        }

        const raw = (scanValueRef.current || "").trim();
        if (!raw) return;

        scanTimerRef.current = window.setTimeout(() => {
            void procesarScan(raw);
        }, 180);

        return () => {
            if (scanTimerRef.current) {
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = null;
            }
        };
    }, [scanValue, hayAlgunoEditable]);

    const abrirConfirmFinalizar = (detalle: DetalleConteo) => {
        if (!editableDetalle(detalle)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }
        if (!detalle.conteoId) return;
        if (finalizandoByConteoId[detalle.conteoId]) return;

        setConfirmDetalle(detalle);
        setConfirmOpen(true);
    };

    const confirmarFinalizar = async () => {
        const detalle = confirmDetalle;
        if (!detalle) return;

        if (!editableDetalle(detalle)) {
            toast.info("Conteo cerrado. Solo lectura.");
            setConfirmOpen(false);
            setConfirmDetalle(null);
            return;
        }

        const conteoId = detalle.conteoId;
        if (!conteoId) return;

        if (finalizandoByConteoId[conteoId]) return;

        setFinalizandoByConteoId((p) => ({ ...p, [conteoId]: true }));
        try {
            await finalizarConteo(conteoId);
            setDetalles((prev) => prev.map((d) => (d.conteoId === conteoId ? { ...d, estadoConteo: "CERRADO" } : d)));
            toast.success("Conteo cerrado correctamente.");
            setConfirmOpen(false);
            setConfirmDetalle(null);
        } catch (error: any) {
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo cerrar el conteo.";
            toast.error(String(msg));
        } finally {
            setFinalizandoByConteoId((p) => ({ ...p, [conteoId]: false }));
        }
    };

    const confirmLoading = useMemo(() => {
        const id = confirmDetalle?.conteoId;
        if (!id) return false;
        return !!finalizandoByConteoId[id];
    }, [confirmDetalle, finalizandoByConteoId]);

    return (
        <>
            <section className="space-y-6 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
                <header className="space-y-4">
                    <div className="space-y-1">
                        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Conteo manual de inventario</h1>
                        <p className="text-xs sm:text-sm text-slate-600">
                            Escanea el <b>Código ítem</b> para registrar automáticamente. Si está en varias ubicaciones,
                            selecciona ubicación/fila en pantalla.
                        </p>
                    </div>

                    {!hayAlgunoEditable && (
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 sm:p-4 shadow-sm text-xs sm:text-sm text-yellow-900">
                            No hay conteos abiertos. Solo lectura.
                        </div>
                    )}

                    <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm space-y-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                            <div className="flex-1 md:max-w-xl space-y-1">
                                <div className="text-[11px] sm:text-xs font-medium text-slate-700">Escáner (Código ítem)</div>

                                <Input
                                    ref={scanInputRef}
                                    value={scanValue}
                                    disabled={!hayAlgunoEditable}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        scanValueRef.current = v;
                                        setScanValue(v);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key !== "Enter") return;
                                        e.preventDefault();

                                        if (scanTimerRef.current) {
                                            window.clearTimeout(scanTimerRef.current);
                                            scanTimerRef.current = null;
                                        }

                                        const v = (e.currentTarget.value || "").trim();
                                        void procesarScan(v);
                                    }}
                                    placeholder="Escanea Código ítem"
                                    className="text-xs sm:text-sm"
                                    autoComplete="off"
                                />
                            </div>

                            <div className="flex flex-col gap-2 w-full md:w-44 md:items-stretch shrink-0">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={limpiarFiltros}
                                    className="text-xs sm:text-sm w-full"
                                >
                                    Limpiar filtros
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="text-[11px] sm:text-xs font-medium text-slate-700">Búsqueda manual</div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                <Input
                                    value={busqueda.etiqueta}
                                    onChange={(e) => setBusqueda((p) => ({ ...p, etiqueta: e.target.value }))}
                                    placeholder="Etiqueta"
                                    className="text-xs sm:text-sm"
                                />
                                <Input
                                    value={busqueda.codigoItem}
                                    onChange={(e) => setBusqueda((p) => ({ ...p, codigoItem: e.target.value }))}
                                    placeholder="Código ítem"
                                    className="text-xs sm:text-sm"
                                />
                                <Input
                                    value={busqueda.descripcion}
                                    onChange={(e) => setBusqueda((p) => ({ ...p, descripcion: e.target.value }))}
                                    placeholder="Descripción"
                                    className="text-xs sm:text-sm"
                                />
                                <Input
                                    value={busqueda.lote}
                                    onChange={(e) => setBusqueda((p) => ({ ...p, lote: e.target.value }))}
                                    placeholder="Lote"
                                    className="text-xs sm:text-sm"
                                />
                                <Input
                                    value={busqueda.ubicacion}
                                    onChange={(e) => setBusqueda((p) => ({ ...p, ubicacion: e.target.value }))}
                                    placeholder="Ubicación"
                                    className="text-xs sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </header>

                <UbicacionPickerModal
                    open={hayAlgunoEditable && scan.modalOpen}
                    onClose={scan.closeModal}
                    pendingKey={scan.pendingKey}
                    ubicaciones={scan.ubicaciones}
                    ubicCounts={scan.ubicCounts}
                    ubicSelected={scan.ubicSelected}
                    onSelectUbicacion={scan.selectUbicacion}
                    onCambiarUbicacion={() => scan.setUbicSelected(null)}
                    filasDeUbicacion={scan.filasDeUbicacion}
                    onElegirFila={scan.aplicarConteoEnItem}
                />

                {loadingDetalle ? (
                    <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm text-xs sm:text-sm text-slate-500">
                        Cargando conteos actuales...
                    </div>
                ) : detalles.length === 0 ? (
                    <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm text-xs sm:text-sm text-slate-500">
                        No hay conteos pendientes para mostrar.
                    </div>
                ) : (
                    <div className="space-y-6">
                        {detalles.map((detalle) => {
                            const key = `${detalle.operacionId}-${detalle.grupoId}-${detalle.numeroConteo}`;
                            const st = estadoByDetalleKey[key] || "";
                            const editable = editableDetalle(detalle);
                            const finalizando = !!finalizandoByConteoId[detalle.conteoId];

                            return (
                                <div key={key} className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4 shadow-sm">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="space-y-1 text-xs sm:text-sm">
                                            <div className="flex flex-wrap items-center gap-1">
                                                <span className="font-semibold">Grupo:</span>
                                                <span>{detalle.grupo}</span>
                                            </div>
                                            <div className="text-slate-600">
                                                Operación {detalle.operacionId} · Conteo #{detalle.numeroConteo}
                                                {st ? ` · ${st}` : ""}
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-auto">
                                            <Button
                                                type="button"
                                                size="sm"
                                                onClick={() => abrirConfirmFinalizar(detalle)}
                                                disabled={!editable || finalizando}
                                                className="w-full sm:w-auto"
                                            >
                                                {finalizando ? "Finalizando..." : "Finalizar conteo"}
                                            </Button>
                                        </div>
                                    </div>

                                    {!editable && (
                                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs sm:text-sm text-yellow-900">
                                            Conteo cerrado. Solo lectura.
                                        </div>
                                    )}

                                    <ConteoTable
                                        items={detalle.items as ItemConteo[]}
                                        loading={loadingItems}
                                        onUpdateCantidad={guardarCantidadAbsoluta}
                                        selectedItemId={selectedItemId}
                                        searchFilters={busqueda}
                                        editable={editable}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            <Dialog
                open={confirmOpen}
                onOpenChange={(v) => {
                    if (confirmLoading) return; // evita cerrar mientras finaliza
                    setConfirmOpen(v);
                    if (!v) setConfirmDetalle(null);
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Finalizar este conteo?</DialogTitle>
                        <DialogDescription>
                            Quedará en solo lectura.
                            {confirmDetalle
                                ? ` (Grupo: ${confirmDetalle.grupo} · Conteo #${confirmDetalle.numeroConteo})`
                                : ""}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline" disabled={confirmLoading}>
                                Cancelar
                            </Button>
                        </DialogClose>

                        <Button onClick={() => void confirmarFinalizar()} disabled={confirmLoading}>
                            {confirmLoading ? "Finalizando..." : "Finalizar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Conteos;
