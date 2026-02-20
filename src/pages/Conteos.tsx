import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { SearchFilters } from "@/components/conteos/ConteoTable";
import ConteosDetalleList from "@/components/conteos/ConteosDetalleList";
import ConteosFinalizarFlow, { ConteosFinalizarFlowHandle } from "@/components/conteos/ConteosFinalizarFlow";
import ConteosScanBlock, { ConteosScanBlockHandle, ScanApplyPayload } from "@/components/conteos/ConteosScanBlock";

import { actualizarCantidadContada, DetalleConteo, obtenerConteoActual } from "@/services/conteoService";

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
    const [confirmOpen, setConfirmOpen] = useState(false);

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
        const conteoId = itemToConteoIdRef.current[itemId];
        if (!conteoId) return false;
        const key = detalleKeyByItemId[itemId];
        if (!key) return true;
        const st = estadoByDetalleKey[key];
        if (!st) return true;
        return st === "ABIERTO";
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

    const enqueuePersist = (itemId: number, cantidad: number) => {
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

    const guardarCantidadAbsoluta = async (itemId: number, cantidad: number) => {
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

        const n = Number(cantidad);
        const nueva = Number.isFinite(n) ? Math.max(0, n) : 0;

        const prevConfirm = confirmedByIdRef.current[itemId] ?? null;
        setLocalCantidad(itemId, nueva);
        setManaged(itemId, true);

        try {
            await enqueuePersist(itemId, nueva);
        } catch (error: any) {
            console.error(error);
            setLocalCantidad(itemId, prevConfirm);
            throw error;
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
                    highlightByConteoId={highlightByConteoId}
                    loadingItems={loadingItems}
                    selectedItemId={selectedItemId}
                    searchFilters={busqueda}
                    onFinalizarClick={(d) => finalizarRef.current?.openConfirm(d)}
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
        </>
    );
};

export default Conteos;
