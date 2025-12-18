import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import UbicacionPickerModal from "@/components/conteos/UbicacionPickerModal";
import ConteosHeader from "@/components/conteos/ConteosHeader";
import ConteoDetalleCard from "@/components/conteos/ConteoDetalleCard";
import { useConteoScan } from "@/hooks/useConteoScan";

import {
    obtenerConteoActual,
    actualizarCantidadContada,
    finalizarConteo,
    DetalleConteo,
} from "@/services/conteoService";

import { SearchFilters } from "@/components/conteos/ConteoTable";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type InputSource = "scanner" | "manual";

const Conteos = () => {
    const [detalles, setDetalles] = useState<DetalleConteo[]>([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const [scanValue, setScanValue] = useState("");
    const scanValueRef = useRef("");

    const [scanApply, setScanApply] = useState<{
        itemId: number;
        value: number;
        mode: "sum" | "replace";
        nonce: number;
    } | null>(null);

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

    const qtyByIdRef = useRef<Record<number, number | null>>({});
    const confirmedByIdRef = useRef<Record<number, number | null>>({});
    const queueByIdRef = useRef<Record<number, Promise<void>>>({});

    // Opción B: tracking "gestionado"
    const gestionadoByIdRef = useRef<Record<number, boolean>>({});
    const itemToConteoIdRef = useRef<Record<number, number>>({});

    // resaltar pendientes solo al intentar finalizar
    const [highlightByConteoId, setHighlightByConteoId] = useState<Record<number, boolean>>({});

    // ====== DETECCIÓN ORIGEN INPUT (scanner vs manual) ======
    const inputSourceRef = useRef<InputSource>("scanner"); // default scanner
    const lastScanSourceRef = useRef<InputSource>("scanner"); // última operación de escaneo
    const lastChangeAtRef = useRef<number>(0);
    const lastLenRef = useRef<number>(0);

    // umbrales (ms): scanners suelen ir < 30-40ms por char
    const SCAN_FAST_MS = 45;
    const MANUAL_SLOW_MS = 140;

    const markManualIntent = () => {
        inputSourceRef.current = "manual";
    };

    const markScannerIntent = () => {
        inputSourceRef.current = "scanner";
    };

    // si el usuario hace foco/click en otros inputs (tabla), no robamos foco
    useEffect(() => {
        const onFocusIn = (e: FocusEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;

            const scanEl = scanInputRef.current;
            if (scanEl && t === scanEl) return;

            const isEditable =
                t.tagName === "INPUT" ||
                t.tagName === "TEXTAREA" ||
                (t as any).isContentEditable;

            if (isEditable) markManualIntent();
        };

        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;

            const scanEl = scanInputRef.current;
            if (scanEl && t === scanEl) return;

            const isEditable =
                t.tagName === "INPUT" ||
                t.tagName === "TEXTAREA" ||
                (t as any).isContentEditable;

            if (isEditable) markManualIntent();
        };

        window.addEventListener("focusin", onFocusIn, true);
        window.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            window.removeEventListener("focusin", onFocusIn, true);
            window.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, []);

    // ====== foco ======
    const focusScanner = () => {
        // “fuerte” para ganar a restoreFocus de Radix
        setTimeout(() => {
            requestAnimationFrame(() => {
                const el = scanInputRef.current;
                if (!el) return;
                el.focus();
                el.select();
            });
        }, 0);
    };

    const clearScanRefsOnly = () => {
        scanValueRef.current = "";
        lastLenRef.current = 0;
    };

    const clearScanAndState = () => {
        scanValueRef.current = "";
        setScanValue("");
        lastLenRef.current = 0;
    };

    const afterModalOrDialogClose = () => {
        // solo devolvemos foco si veníamos de scanner
        if (lastScanSourceRef.current !== "scanner") return;
        clearScanAndState();
        focusScanner();
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

    const isManaged = (itemId: number) => !!gestionadoByIdRef.current[itemId];

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

                managed[it.id] = n !== null && n !== undefined && Number.isFinite(n as any) && n !== 0;
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

    const guardarCantidadAbsoluta = async (itemId: number, cantidad: number) => {
        // edición manual => modo manual (no robar foco)
        markManualIntent();

        if (!editableItemId(itemId)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }

        const n = Number(cantidad);
        const nueva = Number.isFinite(n) ? Math.max(0, n) : 0;

        const prevConfirm = confirmedByIdRef.current[itemId] ?? null;
        setLocalCantidad(itemId, nueva);
        setManaged(itemId, true);

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
        void enqueuePersist(itemId, nueva);
    };

    const resetBusquedaManual = () => {
        setBusqueda({ etiqueta: "", codigoItem: "", descripcion: "", lote: "", ubicacion: "" });
    };

    const handleSelectItem = (itemId: number | null) => {
        if (itemId === null) {
            setSelectedItemId(null);
            return;
        }

        if (inputSourceRef.current === "scanner") {
            setSelectedItemId(null);
            return;
        }

        setSelectedItemId(itemId);
    };

    const scan = useConteoScan({
        detalles,
        onSumarCantidad: sumarCantidad,
        onSelectItem: handleSelectItem,
        onResetBusquedaManual: resetBusquedaManual,
        onScanApplied: (itemId, value, opts) => {
            // si se aplicó por scan, es scanner
            markScannerIntent();
            lastScanSourceRef.current = "scanner";

            setScanApply({
                itemId,
                value,
                mode: opts?.mode ?? "sum",
                nonce: Date.now(),
            });

            if (opts?.mode === "replace") {
                setLocalCantidad(itemId, value);
                setManaged(itemId, true);
                void enqueuePersist(itemId, value);
            }
        },
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

    // foco inicial (pero no compite con modal/dialog)
    useEffect(() => {
        if (!hayAlgunoEditable) return;
        if (scan.modalOpen || confirmOpen) return;
        scanInputRef.current?.focus();
    }, [detalles.length, hayAlgunoEditable, scan.modalOpen, confirmOpen]);

    // si el modal se cierra “programático”, igual refocamos (si venía de scanner)
    const prevModalOpenRef = useRef(false);
    useEffect(() => {
        const wasOpen = prevModalOpenRef.current;
        const isOpen = scan.modalOpen;

        if (wasOpen && !isOpen) {
            afterModalOrDialogClose();
        }

        prevModalOpenRef.current = isOpen;
    }, [scan.modalOpen]);

    const procesarScan = async (raw: string, sourceOverride?: InputSource) => {
        const sourceAtStart: InputSource = sourceOverride ?? inputSourceRef.current;
        lastScanSourceRef.current = sourceAtStart;

        if (!hayAlgunoEditable) {
            toast.info("No hay conteos abiertos. Solo lectura.");
            clearScanAndState();
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
            // Evita que el debounce vuelva a disparar
            clearScanRefsOnly();

            // Nunca seleccionar inputs de la tabla al escanear
            setSelectedItemId(null);

            requestAnimationFrame(() => {
                // 🔒 SOLO si fue scanner y no hay modal/diálogo abierto
                if (sourceAtStart === "scanner" && !scan.modalOpen && !confirmOpen) {
                    clearScanAndState();
                    focusScanner();
                }
            });
        }
    };


    // debounce auto: SOLO si se detecta scanner
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

        if (inputSourceRef.current !== "scanner") return;

        scanTimerRef.current = window.setTimeout(() => {
            void procesarScan(raw, "scanner");
        }, 180);

        return () => {
            if (scanTimerRef.current) {
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = null;
            }
        };
    }, [scanValue, hayAlgunoEditable]);

    const pendientesDetalle = (detalle: DetalleConteo) => {
        return (detalle.items || []).filter((it) => !isManaged(it.id));
    };

    const abrirConfirmFinalizar = (detalle: DetalleConteo) => {
        markManualIntent();

        if (!editableDetalle(detalle)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }
        if (!detalle.conteoId) return;
        if (finalizandoByConteoId[detalle.conteoId]) return;

        const pendientes = pendientesDetalle(detalle);
        if (pendientes.length > 0) {
            setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: true }));
            toast.warn(`No puedes finalizar: faltan ${pendientes.length} ítem(s) por gestionar.`);
            return;
        }

        setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: false }));
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

        const pendientes = pendientesDetalle(detalle);
        if (pendientes.length > 0) {
            setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: true }));
            toast.warn(`No puedes finalizar: faltan ${pendientes.length} ítem(s) por gestionar.`);
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
            setDetalles((prev) =>
                prev.map((d) => (d.conteoId === conteoId ? { ...d, estadoConteo: "CERRADO" } : d))
            );
            toast.success("Conteo cerrado correctamente.");
            setConfirmOpen(false);
            setConfirmDetalle(null);
            setHighlightByConteoId((p) => ({ ...p, [conteoId]: false }));
            // si el cierre vino de scanner, refoco; si fue manual, no molestamos
            afterModalOrDialogClose();
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
                <ConteosHeader
                    hayAlgunoEditable={hayAlgunoEditable}
                    scanInputRef={scanInputRef}
                    scanValue={scanValue}
                    onScanChange={(v) => {
                        const now = Date.now();
                        const prevLen = lastLenRef.current;
                        const nextLen = (v || "").length;

                        const dt = lastChangeAtRef.current ? now - lastChangeAtRef.current : 0;
                        const deltaLen = nextLen - prevLen;

                        // Heurística:
                        // - si llega muy rápido o pega varios chars de una => scanner
                        // - si viene lento => manual
                        if (deltaLen > 1) {
                            markScannerIntent();
                        } else if (dt > 0 && dt <= SCAN_FAST_MS) {
                            markScannerIntent();
                        } else if (dt >= MANUAL_SLOW_MS) {
                            markManualIntent();
                        }

                        lastChangeAtRef.current = now;
                        lastLenRef.current = nextLen;

                        scanValueRef.current = v;
                        setScanValue(v);
                    }}
                    onScanEnter={(v) => {
                        if (scanTimerRef.current) {
                            window.clearTimeout(scanTimerRef.current);
                            scanTimerRef.current = null;
                        }
                        // Enter explícito: procesa siempre, pero decide foco/selección según origen detectado
                        const src = inputSourceRef.current;
                        lastScanSourceRef.current = src;
                        void procesarScan(v, src);
                    }}
                    busqueda={busqueda}
                    onChangeBusqueda={setBusqueda}
                    onLimpiarFiltros={limpiarFiltros}
                />

                <UbicacionPickerModal
                    open={hayAlgunoEditable && scan.modalOpen}
                    onClose={scan.closeModal}
                    onAfterClose={afterModalOrDialogClose}
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

                            const highlight = !!(detalle.conteoId && highlightByConteoId[detalle.conteoId]);

                            return (
                                <ConteoDetalleCard
                                    key={key}
                                    detalle={detalle}
                                    estado={st}
                                    editable={editable}
                                    finalizando={finalizando}
                                    loadingItems={loadingItems}
                                    selectedItemId={selectedItemId}
                                    searchFilters={busqueda}
                                    onFinalizarClick={abrirConfirmFinalizar}
                                    onUpdateCantidad={guardarCantidadAbsoluta}
                                    isManaged={isManaged}
                                    onSetManaged={setManaged}
                                    highlightUnmanaged={highlight}
                                    scanApply={scanApply}
                                />
                            );
                        })}
                    </div>
                )}
            </section>

            <Dialog
                open={confirmOpen}
                onOpenChange={(v) => {
                    if (confirmLoading) return;
                    setConfirmOpen(v);
                    if (!v) {
                        setConfirmDetalle(null);
                        afterModalOrDialogClose();
                    }
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
