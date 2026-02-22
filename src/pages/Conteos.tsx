import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { SearchFilters } from "@/components/conteos/ConteoTable";
import ConteosDetalleList from "@/components/conteos/ConteosDetalleList";
import ConteosFinalizarFlow, { ConteosFinalizarFlowHandle } from "@/components/conteos/ConteosFinalizarFlow";
import ConteosScanBlock, { ConteosScanBlockHandle, ScanApplyPayload } from "@/components/conteos/ConteosScanBlock";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { actualizarCantidadContada, DetalleConteo, obtenerConteoActual, eliminarConteo } from "@/services/conteoService";

const Conteos = () => {
    const [detalles, setDetalles] = useState<DetalleConteo[]>([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const [scanApply, setScanApply] = useState<ScanApplyPayload | null>(null);

    const [busqueda, setBusqueda] = useState<SearchFilters>({
        etiqueta: "",
        codigoItem: "",
        descripcion: "",
        lote: "",
        ubicacion: "",
    });

    const [finalizandoByConteoId, setFinalizandoByConteoId] = useState<Record<number, boolean>>({});
    const [eliminandoByConteoId, setEliminandoByConteoId] = useState<Record<number, boolean>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmEliminarOpen, setConfirmEliminarOpen] = useState(false);
    const [detalleAEliminar, setDetalleAEliminar] = useState<DetalleConteo | null>(null);

    const didLoadRef = useRef(false);

    const qtyByIdRef = useRef<Record<number, number | null>>({});
    const confirmedByIdRef = useRef<Record<number, number | null>>({});
    const queueByIdRef = useRef<Record<number, Promise<void>>>({});

    const gestionadoByIdRef = useRef<Record<number, boolean>>({});
    const itemToConteoIdRef = useRef<Record<number, number>>({});
    const missingToastByIdRef = useRef<Record<number, number>>({});

    const [highlightByConteoId, setHighlightByConteoId] = useState<Record<number, boolean>>({});

    const scanUiRef = useRef<ConteosScanBlockHandle | null>(null);
    const finalizarRef = useRef<ConteosFinalizarFlowHandle | null>(null);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const retryOnce = async <T,>(fn: () => Promise<T>, delayMs = 400): Promise<T> => {
        try {
            return await fn();
        } catch (err) {
            await sleep(delayMs);
            return await fn();
        }
    };

    const isManaged = (itemId: number) => !!gestionadoByIdRef.current[itemId];

    const estadoByDetalleKey = useMemo(() => {
        const map: Record<string, string> = {};
        for (const d of detalles) {
            const key = `${d.operacionId}-${d.grupoId}-${d.numeroConteo}`;
            map[key] = d.estadoConteo ? String(d.estadoConteo).trim().toUpperCase() : "";
        }
        return map;
    }, [detalles]);

    const editableDetalle = (d: DetalleConteo) => {
        const key = `${d.operacionId}-${d.grupoId}-${d.numeroConteo}`;
        const st = estadoByDetalleKey[key];
        if (!st) return true;
        return st === "EN_CONTEO" || st === "ABIERTO";
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
        const conteoId = itemToConteoIdRef.current[itemId];
        if (!conteoId) return false;
        const key = detalleKeyByItemId[itemId];
        if (!key) return true;
        const st = estadoByDetalleKey[key];
        if (!st) return true;
        return st === "EN_CONTEO" || st === "ABIERTO";
    };

    const toastMissingConteo = (itemId: number) => {
        const now = Date.now();
        const last = missingToastByIdRef.current[itemId] || 0;
        if (now - last < 2000) return;
        missingToastByIdRef.current[itemId] = now;
        toast.error("ConteoId no disponible para este ítem.");
    };

    const hayAlgunoEditable = useMemo(() => {
        if (detalles.length === 0) return true;
        return detalles.some((d) => editableDetalle(d));
    }, [detalles, estadoByDetalleKey]);

    const rebuildQtyRefs = (lista: DetalleConteo[]) => {
        const map: Record<number, number | null> = {};
        const managed: Record<number, boolean> = {};
        const itemToConteo: Record<number, number> = {};

        for (const det of lista) {
            const conteoId = det.conteoId || 0;
            for (const it of det.items) {
                itemToConteo[it.id] = conteoId;

                const v = (it as any).cantidadContada ?? null;
                const n = v === null || v === undefined ? null : Number(v);
                map[it.id] = Number.isFinite(n as any) ? (n as any) : null;

                managed[it.id] = n !== null && n !== undefined && Number.isFinite(n as any);
            }
        }

        qtyByIdRef.current = map;
        confirmedByIdRef.current = { ...map };
        gestionadoByIdRef.current = managed;
        itemToConteoIdRef.current = itemToConteo;
    };

    const setLocalCantidad = (itemId: number, cantidad: number | null) => {
        qtyByIdRef.current[itemId] = cantidad;
        setDetalles((prev) =>
            prev.map((det) => ({
                ...det,
                items: det.items.map((it) =>
                    it.id === itemId ? ({ ...it, cantidadContada: cantidad as any } as any) : it
                ),
            }))
        );
    };

    const setManaged = (itemId: number, managed: boolean) => {
        gestionadoByIdRef.current[itemId] = managed;

        const conteoId = itemToConteoIdRef.current[itemId];
        if (!conteoId) return;

        if (highlightByConteoId[conteoId]) {
            const det = detalles.find((d) => d.conteoId === conteoId);
            if (!det) return;
            const stillMissing = (det.items || []).some((it) => !gestionadoByIdRef.current[it.id]);
            if (!stillMissing) {
                setHighlightByConteoId((p) => ({ ...p, [conteoId]: false }));
            }
        }
    };

    const enqueuePersist = (itemId: number, cantidad: number | null) => {
        const prev = queueByIdRef.current[itemId] ?? Promise.resolve();
        const next = prev
            .catch(() => undefined)
            .then(async () => {
                await retryOnce(() => actualizarCantidadContada(itemId, cantidad));
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
            const listaConConteo = lista.map((det) => ({
                ...det,
                items: (det.items || []).map((it) => ({
                    ...it,
                    conteoId: (it as any).conteoId ?? det.conteoId ?? null,
                })),
            }));
            const missingEstado = listaConConteo.some((det) => !det.estadoConteo);
            if (missingEstado) {
                const flag = "conteos_reload_missing_estado";
                const already = sessionStorage.getItem(flag) === "1";
                if (!already) {
                    sessionStorage.setItem(flag, "1");
                    window.location.reload();
                    return;
                }
            } else {
                sessionStorage.removeItem("conteos_reload_missing_estado");
            }
            setDetalles(listaConConteo);
            rebuildQtyRefs(listaConConteo);
            setHighlightByConteoId({});
        } catch (error) {
            console.error(error);
            toast.error("No se pudo cargar el conteo actual.");
            setDetalles([]);
            qtyByIdRef.current = {};
            confirmedByIdRef.current = {};
            gestionadoByIdRef.current = {};
            itemToConteoIdRef.current = {};
            setHighlightByConteoId({});
        } finally {
            setLoadingDetalle(false);
            setLoadingItems(false);
        }
    };

    const guardarCantidadAbsoluta = async (itemId: number, cantidad: number | null) => {
        scanUiRef.current?.markManualIntent();

        if (!editableItemId(itemId)) {
            const conteoId = itemToConteoIdRef.current[itemId];
            if (!conteoId) {
                toastMissingConteo(itemId);
            } else {
                toast.info("Conteo cerrado. Solo lectura.");
            }
            return;
        }

        const nueva = cantidad === null ? null : Math.max(0, Number(cantidad) || 0);

        const prevConfirm = confirmedByIdRef.current[itemId] ?? null;
        setLocalCantidad(itemId, nueva);
        setManaged(itemId, nueva !== null);

        try {
            await enqueuePersist(itemId, nueva);
        } catch (error: any) {
            console.error(error);
            setLocalCantidad(itemId, prevConfirm);
            setManaged(itemId, prevConfirm !== null);
            throw error;
        }
    };

    const openEliminar = (detalle: DetalleConteo) => {
        setDetalleAEliminar(detalle);
        setConfirmEliminarOpen(true);
    };

    const confirmarEliminar = async () => {
        if (!detalleAEliminar?.conteoId) return;
        const conteoId = detalleAEliminar.conteoId;
        setEliminandoByConteoId((p) => ({ ...p, [conteoId]: true }));
        try {
            await eliminarConteo(conteoId);
            toast.success("Conteo eliminado correctamente.");
            await cargarConteoActual();
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
            setDetalleAEliminar(null);
        }
    };

    const sumarCantidad = async (itemId: number, delta: number) => {
        if (!editableItemId(itemId)) {
            const conteoId = itemToConteoIdRef.current[itemId];
            if (!conteoId) {
                toastMissingConteo(itemId);
            } else {
                toast.info("Conteo cerrado. Solo lectura.");
            }
            return;
        }

        const d = Number(delta);
        if (!Number.isFinite(d) || d <= 0) return;

        const actual = qtyByIdRef.current[itemId];
        const nueva = Math.max(0, (actual ?? 0) + d);

        setScanApply({
            itemId,
            value: d,
            mode: "sum",
            nonce: Date.now(),
        });

        setLocalCantidad(itemId, nueva);
        setManaged(itemId, true);
    };

    const resetBusquedaManual = () => {
        setBusqueda({ etiqueta: "", codigoItem: "", descripcion: "", lote: "", ubicacion: "" });
    };

    const limpiarFiltros = () => {
        setSelectedItemId(null);
        resetBusquedaManual();
    };

    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;
        void cargarConteoActual();
    }, []);

    return (
        <>
            <section className="space-y-6 max-w-6xl mx-auto px-3 sm:px-4 lg:px-6">
                <ConteosScanBlock
                    ref={scanUiRef}
                    detalles={detalles}
                    hayAlgunoEditable={hayAlgunoEditable}
                    confirmOpen={confirmOpen}
                    busqueda={busqueda}
                    onChangeBusqueda={setBusqueda}
                    onLimpiarFiltros={limpiarFiltros}
                    onSumarCantidad={sumarCantidad}
                    onResetBusquedaManual={resetBusquedaManual}
                    onSelectItem={setSelectedItemId}
                    onScanApplied={(payload) => setScanApply(payload)}
                    onReplaceFromScan={(itemId, value) => {
                        setLocalCantidad(itemId, value);
                        setManaged(itemId, true);
                    }}
                />

                <ConteosDetalleList
                    loadingDetalle={loadingDetalle}
                    detalles={detalles}
                    estadoByDetalleKey={estadoByDetalleKey}
                    editableDetalle={editableDetalle}
                    finalizandoByConteoId={finalizandoByConteoId}
                    eliminandoByConteoId={eliminandoByConteoId}
                    highlightByConteoId={highlightByConteoId}
                    loadingItems={loadingItems}
                    selectedItemId={selectedItemId}
                    searchFilters={busqueda}
                    onFinalizarClick={(d) => finalizarRef.current?.openConfirm(d)}
                    onEliminarClick={openEliminar}
                    onUpdateCantidad={guardarCantidadAbsoluta}
                    isManaged={isManaged}
                    onSetManaged={setManaged}
                    scanApply={scanApply}
                />
            </section>

            <ConteosFinalizarFlow
                ref={finalizarRef}
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                detalles={detalles}
                editableDetalle={editableDetalle}
                isManaged={isManaged}
                finalizandoByConteoId={finalizandoByConteoId}
                setFinalizandoByConteoId={setFinalizandoByConteoId}
                highlightByConteoId={highlightByConteoId}
                setHighlightByConteoId={setHighlightByConteoId}
                setDetalles={setDetalles}
                onAfterClose={() => scanUiRef.current?.afterModalOrDialogClose()}
                onMarkManualIntent={() => scanUiRef.current?.markManualIntent()}
            />

            <Dialog
                open={confirmEliminarOpen}
                onOpenChange={(v) => {
                    if (!v) {
                        setConfirmEliminarOpen(false);
                        setDetalleAEliminar(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>¿Eliminar este conteo?</DialogTitle>
                        <DialogDescription>
                            Se eliminará el conteo y la consolidación relacionada. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    {detalleAEliminar ? (
                        <div className="text-sm text-slate-700 space-y-1">
                            <div>
                                <span className="font-medium">Operación:</span> {detalleAEliminar.operacionId}
                            </div>
                            <div>
                                <span className="font-medium">Grupo:</span> {detalleAEliminar.grupo}
                            </div>
                            <div>
                                <span className="font-medium">Conteo:</span> {detalleAEliminar.numeroConteo}
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setConfirmEliminarOpen(false);
                                setDetalleAEliminar(null);
                            }}
                            disabled={detalleAEliminar ? !!eliminandoByConteoId[detalleAEliminar.conteoId] : false}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmarEliminar}
                            disabled={detalleAEliminar ? !!eliminandoByConteoId[detalleAEliminar.conteoId] : false}
                        >
                            {detalleAEliminar && eliminandoByConteoId[detalleAEliminar.conteoId]
                                ? "Eliminando..."
                                : "Eliminar conteo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default Conteos;
