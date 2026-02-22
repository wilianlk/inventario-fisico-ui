import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
    generarDI81,
    obtenerConteosFinalizados,
    consolidacionFinalizada,
    cerrarConsolidacion,
} from "@/services/consolidacionService";
import ConsolidacionFilters from "@/components/consolidacion/ConsolidacionFilters";
import ConsolidacionTable from "@/components/consolidacion/ConsolidacionTable";
import {
    applyFilters,
    buildConsolidado,
    ConsolidacionFilters as FType,
    BackendConsolidadoItem,
} from "@/hooks/consolidacion.logic";

type FinalizarModalProps = {
    open: boolean;
    loading: boolean;
    onClose: () => void;
    onConfirm: () => void;
};

const FinalizarModal = ({ open, loading, onClose, onConfirm }: FinalizarModalProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => (!loading ? onClose() : null)} />
            <div className="relative w-full max-w-md rounded-xl bg-white shadow-lg p-5">
                <h3 className="text-base font-semibold text-slate-900">Confirmar finalización</h3>
                <p className="mt-2 text-sm text-slate-600">
                    ¿Está seguro de finalizar el inventario? Esta acción no se puede deshacer.
                </p>

                <div className="mt-5 flex justify-end gap-2">
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
                        onClick={onConfirm}
                    >
                        {loading ? "Finalizando..." : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Consolidacion = () => {
    const [items, setItems] = useState<BackendConsolidadoItem[]>([]);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState<FType>({
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

    const [finalizada, setFinalizada] = useState(false);
    const [validandoEstado, setValidandoEstado] = useState(false);

    const didInit = useRef(false);

    const errorMsg = (e: any, fallback: string) => {
        const data = e?.response?.data;

        if (typeof data === "string" && data.trim()) return data;
        if (data?.mensaje) return String(data.mensaje);

        if (data?.detail) return String(data.detail);
        if (data?.title) return String(data.title);

        const errors = data?.errors;
        if (errors && typeof errors === "object") {
            const firstKey = Object.keys(errors)[0];
            const firstVal = firstKey ? (errors as any)[firstKey] : null;
            if (Array.isArray(firstVal) && firstVal.length > 0) return String(firstVal[0]);
        }

        if (e?.message) return String(e.message);
        return fallback;
    };

    const getOperacionIdsFromItems = (arr: any[]): number[] => {
        const ids = new Set<number>();
        for (const x of arr ?? []) {
            const id = x?.operacionId ?? x?.OperacionId;
            const n = id !== null && id !== undefined ? Number(id) : 0;
            if (Number.isFinite(n) && n > 0) ids.add(n);
        }
        return Array.from(ids);
    };

    const getOperacionIds = (): number[] => getOperacionIdsFromItems(items as any[]);

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

    const nombreDesdeHeaders = (headers: any, fallback: string) => {
        const cd = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
        const match = String(cd).match(/filename="?([^"]+)"?/i);
        return match?.[1] || fallback;
    };

    const validarFinalizada = async (operacionId: number): Promise<boolean> => {
        try {
            const resp = await consolidacionFinalizada(operacionId);
            return Boolean(resp.data?.finalizada);
        } catch (e) {
            console.error(e);
            toast.error(`No se pudo validar el estado de la consolidación (operación ${operacionId}).`);
            return false;
        }
    };

    const validarTodasFinalizadas = async (ids: number[]): Promise<boolean> => {
        if (!ids.length) return false;
        const resultados = await Promise.all(ids.map((id) => validarFinalizada(id)));
        return resultados.every(Boolean);
    };

    const cargar = async () => {
        setLoading(true);
        try {
            const resp = await obtenerConteosFinalizados();
            const raw = (resp.data?.items ?? resp.data ?? []) as BackendConsolidadoItem[];
            const next = Array.isArray(raw) ? raw : [];

            if (finalizada && next.length === 0 && items.length > 0) {
                toast.info("La consolidación está finalizada. Se mantiene el snapshot en pantalla.");
                return;
            }

            setItems(next);

            const ids = getOperacionIdsFromItems(next as any[]).sort((a, b) => a - b);
            if (ids.length >= 1) {
                setValidandoEstado(true);
                const ok = await validarTodasFinalizadas(ids);
                setFinalizada(ok);
                setValidandoEstado(false);
            } else {
                setFinalizada(false);
            }
        } catch (e) {
            console.error(e);
            toast.error("No se pudo cargar la consolidación.");
            if (!finalizada) setItems([]);
            if (!finalizada) setFinalizada(false);
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

    const baseRows = useMemo(() => buildConsolidado(items), [items]);
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

    const finalizar = async () => {
        const operacionIds = getOperacionIds();

        if (operacionIds.length === 0) {
            toast.error("No hay operación cargada para finalizar.");
            return;
        }

        try {
            setFinalizando(true);

            for (const operacionId of operacionIds) {
                await cerrarConsolidacion(operacionId);
            }

            toast.success("Operaciones y consolidación finalizadas.");
            setFinalizada(true);
            setOpenFinalizar(false);
        } catch (e: any) {
            toast.error(errorMsg(e, "No se pudo finalizar la consolidación."));
        } finally {
            setFinalizando(false);
        }
    };

    const generarArchivo = async () => {
        const operacionIds = getOperacionIds();

        if (operacionIds.length === 0) {
            toast.error("No hay operación cargada.");
            return;
        }

        if (!finalizada) {
            toast.error("La consolidación no está FINALIZADA para todas las operaciones.");
            return;
        }

        try {
            for (const operacionId of operacionIds) {
                const resp = await generarDI81(operacionId);
                const filename = nombreDesdeHeaders(resp.headers, `DI81_${operacionId}.txt`);
                descargarBlob(resp.data, filename);
            }
        } catch (e: any) {
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

                <ConsolidacionFilters
                    value={filters}
                    onChange={setFilters}
                    onClear={limpiar}
                    onReload={() => {
                        if (finalizada) {
                            toast.info("La consolidación está finalizada. No se recarga para mantener la información en pantalla.");
                            return;
                        }
                        void cargar();
                    }}
                    loading={loading}
                    resumen={resumen}
                />
            </header>

            <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
                <div className="px-4 sm:px-6">
                    <div className="mx-auto max-w-[1700px] w-full flex justify-end">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                            disabled={loading || finalizando || validandoEstado}
                            onClick={() => {
                                const ids = getOperacionIds();
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
                        >
                            {validandoEstado ? "Validando..." : finalizada ? "Generar archivo" : "Finalizar"}
                        </button>
                    </div>
                </div>
            </div>

            <ConsolidacionTable rows={rows} />

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
