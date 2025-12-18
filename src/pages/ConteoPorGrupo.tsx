import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import ConteoTable, { SearchFilters } from "@/components/conteos/ConteoTable";
import UbicacionPickerModal from "@/components/conteos/UbicacionPickerModal";
import FinalizarConteoDialog from "@/components/conteos/FinalizarConteoDialog";
import { useConteoScan } from "@/hooks/useConteoScan";

import {
    obtenerConteoPorGrupo,
    actualizarCantidadContada,
    finalizarConteo,
    ItemConteo,
    ConteoPorGrupoResponse,
} from "@/services/conteoService";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function ConteoPorGrupo() {
    const { operacionId, grupoId } = useParams<{ operacionId: string; grupoId: string }>();

    const opId = useMemo(() => Number(operacionId), [operacionId]);
    const gId = useMemo(() => Number(grupoId), [grupoId]);

    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<ConteoPorGrupoResponse | null>(null);
    const [items, setItems] = useState<ItemConteo[]>([]);

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    const [scanValue, setScanValue] = useState("");
    const scanValueRef = useRef("");

    const [searchFilters, setSearchFilters] = useState<SearchFilters>({
        etiqueta: "",
        codigoItem: "",
        descripcion: "",
        lote: "",
        ubicacion: "",
    });

    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const didLoadRef = useRef(false);
    const scanTimerRef = useRef<number | null>(null);

    // Opción B: ahora nullable para no “inventar 0”
    const qtyByIdRef = useRef<Record<number, number | null>>({});
    const confirmedByIdRef = useRef<Record<number, number | null>>({});
    const queueByIdRef = useRef<Record<number, Promise<void>>>({});

    // Opción B: tracking de “gestionado”
    const gestionadoByIdRef = useRef<Record<number, boolean>>({});

    const [finalizarOpen, setFinalizarOpen] = useState(false);
    const [finalizando, setFinalizando] = useState(false);

    // Resaltar pendientes SOLO cuando se intenta finalizar
    const [highlightUnmanaged, setHighlightUnmanaged] = useState(false);

    const estadoConteo = useMemo(() => {
        const v = info?.estadoConteo;
        return v ? String(v).toUpperCase() : "";
    }, [info]);

    const editable = useMemo(() => {
        if (!estadoConteo) return true;
        return estadoConteo === "ABIERTO";
    }, [estadoConteo]);

    const isManaged = (id: number) => !!gestionadoByIdRef.current[id];

    const setManaged = (id: number, managed: boolean) => {
        gestionadoByIdRef.current[id] = managed;

        // si estamos resaltando pendientes y ya no quedan, apagamos el resaltado
        if (highlightUnmanaged && managed) {
            const stillMissing = (items || []).some((it) => !gestionadoByIdRef.current[it.id]);
            if (!stillMissing) setHighlightUnmanaged(false);
        }
    };

    const rebuildQtyRefs = (lista: ItemConteo[]) => {
        const map: Record<number, number | null> = {};
        const managed: Record<number, boolean> = {};

        for (const it of lista) {
            const raw = (it as any).cantidadContada ?? null;
            const n = raw === null || raw === undefined ? null : Number(raw);
            const val = Number.isFinite(n as any) ? (n as any) : null;

            map[it.id] = val;

            // Opción B: 0 inicial NO es gestionado hasta que el usuario toque el ítem
            managed[it.id] = val !== null && val !== undefined && val !== 0;
        }

        qtyByIdRef.current = map;
        confirmedByIdRef.current = { ...map };
        gestionadoByIdRef.current = managed;

        // al recargar, apagamos resaltado
        setHighlightUnmanaged(false);
    };

    const setLocalCantidad = (itemId: number, cantidad: number | null) => {
        qtyByIdRef.current[itemId] = cantidad;

        setItems((prev) =>
            prev.map((it) =>
                it.id === itemId ? ({ ...it, cantidadContada: cantidad as any } as any) : it
            )
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

    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;

        const cargar = async () => {
            if (!Number.isFinite(opId) || !Number.isFinite(gId) || opId <= 0 || gId <= 0) {
                setLoading(false);
                setInfo(null);
                setItems([]);
                toast.error("Enlace inválido.");
                return;
            }

            setLoading(true);
            try {
                const resp = await obtenerConteoPorGrupo(opId, gId);
                const data = resp.data;
                setInfo(data);

                const lista = data.items || [];
                setItems(lista);
                rebuildQtyRefs(lista);
            } catch (error: any) {
                setInfo(null);
                setItems([]);
                qtyByIdRef.current = {};
                confirmedByIdRef.current = {};
                gestionadoByIdRef.current = {};
                setHighlightUnmanaged(false);

                const msg =
                    error?.response?.data?.mensaje ||
                    error?.response?.data?.message ||
                    (typeof error?.response?.data === "string" ? error.response.data : null) ||
                    error?.message ||
                    "No se pudo cargar el conteo del grupo.";

                toast.error(String(msg));
            } finally {
                setLoading(false);
            }
        };

        void cargar();
    }, [opId, gId]);

    useEffect(() => {
        if (!editable) return;
        scanInputRef.current?.focus();
    }, [items.length, editable]);

    const guardarCantidadAbsoluta = async (itemId: number, cantidad: number) => {
        if (!editable) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }

        const n = Number(cantidad);
        const nueva = Number.isFinite(n) ? Math.max(0, n) : 0;

        const prevConfirm = confirmedByIdRef.current[itemId] ?? null;

        setLocalCantidad(itemId, nueva);
        setManaged(itemId, true); // 0 explícito cuenta como gestionado

        try {
            await enqueuePersist(itemId, nueva);
            toast.success("Cantidad contada guardada.");
        } catch (error: any) {
            setLocalCantidad(itemId, prevConfirm);
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo guardar la cantidad contada.";
            toast.error(String(msg));
            throw error;
        }
    };

    const sumarCantidad = async (itemId: number, delta: number) => {
        if (!editable) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }

        const d = Number(delta);
        if (!Number.isFinite(d) || d <= 0) return;

        const actual = qtyByIdRef.current[itemId] ?? 0;
        const nueva = Math.max(0, actual + d);

        const prevConfirm = confirmedByIdRef.current[itemId] ?? null;

        setLocalCantidad(itemId, nueva);
        setManaged(itemId, true);

        try {
            await enqueuePersist(itemId, nueva);
        } catch (error: any) {
            console.error(error);
            setLocalCantidad(itemId, prevConfirm);
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo guardar la cantidad contada.";
            toast.error(String(msg));
            throw error;
        }
    };

    const resetBusquedaManual = () => {
        setSearchFilters({ etiqueta: "", codigoItem: "", descripcion: "", lote: "", ubicacion: "" });
    };

    const scan = useConteoScan({
        detalles: info
            ? [
                {
                    operacionId: opId,
                    grupoId: gId,
                    grupo: info.grupo ?? "",
                    conteoId: info.conteoId,
                    numeroConteo: info.numeroConteo,
                    estadoConteo: info.estadoConteo,
                    items: items,
                },
            ]
            : [],
        onSumarCantidad: sumarCantidad,
        onSelectItem: setSelectedItemId,
        onResetBusquedaManual: resetBusquedaManual,
    });

    const limpiarFiltros = () => {
        setSelectedItemId(null);
        resetBusquedaManual();
    };

    const procesarScan = async (raw: string) => {
        if (!editable) {
            toast.info("Conteo cerrado. Solo lectura.");
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

            // ✅ Ajuste: forzar retorno al input del escáner (gana sobre focus internos)
            requestAnimationFrame(() => {
                setTimeout(() => {
                    scanInputRef.current?.focus();
                    scanInputRef.current?.select();
                }, 0);
            });
        }
    };

    useEffect(() => {
        if (!editable) {
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
    }, [scanValue, editable]);

    const pendientes = useMemo(() => {
        return (items || []).filter((it) => !isManaged(it.id));
    }, [items, highlightUnmanaged]);

    const intentarFinalizar = () => {
        if (!editable) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }
        if (!info?.conteoId) return;
        if (finalizando) return;

        const p = (items || []).filter((it) => !isManaged(it.id));
        if (p.length > 0) {
            setHighlightUnmanaged(true);
            toast.warn(`No puedes finalizar: faltan ${p.length} ítem(s) por gestionar.`);
            return;
        }

        setHighlightUnmanaged(false);
        setFinalizarOpen(true);
    };

    const confirmarFinalizar = async () => {
        if (!info?.conteoId || !editable || finalizando) return;

        const p = (items || []).filter((it) => !isManaged(it.id));
        if (p.length > 0) {
            setHighlightUnmanaged(true);
            toast.warn(`No puedes finalizar: faltan ${p.length} ítem(s) por gestionar.`);
            setFinalizarOpen(false);
            return;
        }

        setFinalizando(true);
        try {
            await finalizarConteo(info.conteoId);
            setInfo((prev) => (prev ? { ...prev, estadoConteo: "CERRADO" } : prev));
            toast.success("Conteo cerrado correctamente.");
            setFinalizarOpen(false);
            setHighlightUnmanaged(false);
        } catch (error: any) {
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo cerrar el conteo.";
            toast.error(String(msg));
        } finally {
            setFinalizando(false);
        }
    };

    return (
        <section className="space-y-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="text-sm text-slate-600">Conteo por grupo</div>
                    <div className="text-base font-semibold text-slate-900">
                        Operación {Number.isFinite(opId) ? opId : "-"} ·{" "}
                        {info?.grupo ? info.grupo : `Grupo ${Number.isFinite(gId) ? gId : "-"}`}
                        {info?.numeroConteo ? ` · Conteo ${info.numeroConteo}` : ""}
                        {estadoConteo ? ` · ${estadoConteo}` : ""}
                    </div>
                </div>

                {!editable && (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
                        Conteo cerrado. Solo lectura.
                    </div>
                )}

                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="flex-1 md:max-w-xl space-y-1">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-700">
                            Escáner (código / etiqueta)
                        </div>

                        <Input
                            ref={scanInputRef}
                            value={scanValue}
                            disabled={!editable}
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
                            placeholder="Escanea el código"
                            className="text-xs sm:text-sm"
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex flex-col gap-2 md:gap-3 w-full md:w-44">
                        <Button
                            type="button"
                            size="sm"
                            onClick={intentarFinalizar}
                            disabled={!editable || !info?.conteoId || finalizando}
                            className="text-xs sm:text-sm w-full"
                        >
                            {finalizando ? "Finalizando..." : "Finalizar conteo"}
                        </Button>

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

                <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-5">
                    <div>
                        <Label htmlFor="f-etiqueta">Etiqueta</Label>
                        <Input
                            id="f-etiqueta"
                            value={searchFilters.etiqueta}
                            onChange={(e) => setSearchFilters((p) => ({ ...p, etiqueta: e.target.value }))}
                            placeholder="Buscar..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="f-codigo">Código</Label>
                        <Input
                            id="f-codigo"
                            value={searchFilters.codigoItem}
                            onChange={(e) => setSearchFilters((p) => ({ ...p, codigoItem: e.target.value }))}
                            placeholder="Buscar..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="f-desc">Descripción</Label>
                        <Input
                            id="f-desc"
                            value={searchFilters.descripcion}
                            onChange={(e) => setSearchFilters((p) => ({ ...p, descripcion: e.target.value }))}
                            placeholder="Buscar..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="f-lote">Lote</Label>
                        <Input
                            id="f-lote"
                            value={searchFilters.lote}
                            onChange={(e) => setSearchFilters((p) => ({ ...p, lote: e.target.value }))}
                            placeholder="Buscar..."
                        />
                    </div>
                    <div>
                        <Label htmlFor="f-ubi">Ubicación</Label>
                        <Input
                            id="f-ubi"
                            value={searchFilters.ubicacion}
                            onChange={(e) => setSearchFilters((p) => ({ ...p, ubicacion: e.target.value }))}
                            placeholder="Buscar..."
                        />
                    </div>
                </div>
            </div>

            <UbicacionPickerModal
                open={editable && scan.modalOpen}
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

            <ConteoTable
                items={items}
                loading={loading}
                onUpdateCantidad={guardarCantidadAbsoluta}
                selectedItemId={selectedItemId}
                searchFilters={searchFilters}
                editable={editable}
                isManaged={isManaged}
                onSetManaged={setManaged}
                highlightUnmanaged={highlightUnmanaged}
            />

            <FinalizarConteoDialog
                open={finalizarOpen}
                onOpenChange={(v) => {
                    if (finalizando) return;
                    setFinalizarOpen(v);
                }}
                onConfirm={() => void confirmarFinalizar()}
                loading={finalizando}
            />
        </section>
    );
}

export default ConteoPorGrupo;
