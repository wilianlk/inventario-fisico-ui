import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { DetalleConteo } from "@/services/conteoService";
import {
    generarDI81,
    obtenerConteosFinalizados,
    consolidacionFinalizada,
    finalizarOperaciones,
} from "@/services/consolidacionService";
import ConsolidacionFilters from "@/components/consolidacion/ConsolidacionFilters";
import ConsolidacionTable from "@/components/consolidacion/ConsolidacionTable";
import { applyFilters, buildConsolidado, ConsolidacionFilters as FType } from "@/hooks/consolidacion.logic";

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
    const [detalles, setDetalles] = useState<DetalleConteo[]>([]);
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

    const mapConteosFinalizadosToDetalle = (data: any[]): DetalleConteo[] => {
        return (data ?? []).map((x: any) => {
            const conteo = x?.conteo ?? x?.Conteo ?? {};
            const items = x?.items ?? x?.Items ?? [];

            const grupoNombre = conteo?.nombreGrupo ?? conteo?.NombreGrupo ?? "";

            return {
                operacionId: Number(conteo?.operacionId ?? conteo?.OperacionId ?? 0),
                grupoId: Number(conteo?.grupoId ?? conteo?.GrupoId ?? 0),
                grupo: String(grupoNombre ?? "").trim(),
                conteoId: Number(conteo?.id ?? conteo?.Id ?? 0),
                numeroConteo: Number(conteo?.numeroConteo ?? conteo?.NumeroConteo ?? 0),
                estadoConteo: String(conteo?.estado ?? conteo?.Estado ?? "").trim(),
                items: Array.isArray(items) ? items : [],
            } as any;
        });
    };

    const getOperacionIdsFrom = (arr: any[]): number[] => {
        const ids = new Set<number>();
        for (const d of arr as any[]) {
            const id = d?.operacionId ?? d?.OperacionId;
            const n = id !== null && id !== undefined ? Number(id) : 0;
            if (Number.isFinite(n) && n > 0) ids.add(n);
        }
        return Array.from(ids);
    };

    const getOperacionIds = (): number[] => getOperacionIdsFrom(detalles as any[]);

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
            return Boolean((resp.data as any)?.finalizada);
        } catch (e) {
            console.error(e);
            toast.error(`No se pudo validar el estado de la consolidación (operación ${operacionId}).`);
            return false;
        }
    };

    const cargar = async () => {
        setLoading(true);
        try {
            const resp = await obtenerConteosFinalizados();
            const data = (resp.data as any[]) ?? [];
            const mapped = mapConteosFinalizadosToDetalle(data);
            setDetalles(mapped);

            const ids = getOperacionIdsFrom(mapped as any[]);
            if (ids.length === 1) {
                setValidandoEstado(true);
                const ok = await validarFinalizada(ids[0]);
                setFinalizada(ok);
                setValidandoEstado(false);
            } else {
                setFinalizada(false);
            }
        } catch (e) {
            console.error(e);
            toast.error("No se pudo cargar la consolidación.");
            setDetalles([]);
            setFinalizada(false);
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

    const baseRows = useMemo(() => buildConsolidado(detalles), [detalles]);
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

            const resp = await finalizarOperaciones({
                operacionIds,
                operacionesFinalizadas: [],
            });

            const fin = (resp?.data as any)?.operacionesFinalizadas ?? [];

            if (Array.isArray(fin) && fin.length > 0) {
                toast.success(
                    fin.length === 1
                        ? "Consolidación finalizada."
                        : `Consolidación finalizada. Operaciones: ${fin.length}.`
                );
                setOpenFinalizar(false);
                void cargar();
            } else {
                toast.error("No se pudo finalizar la consolidación.");
            }
        } catch (e: any) {
            const msg = e?.response?.data?.mensaje || e?.message || "No se pudo finalizar la consolidación.";
            toast.error(msg);
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

        if (operacionIds.length !== 1) {
            toast.error("Solo se puede generar el archivo cuando hay una sola operación cargada.");
            return;
        }

        const operacionId = operacionIds[0];

        if (!finalizada) {
            toast.error(
                `Operación ${operacionId}: la consolidación no está FINALIZADA. Solo cuando esté FINALIZADA se puede generar el archivo.`
            );
            return;
        }

        try {
            const resp = await generarDI81(operacionId);
            const filename = nombreDesdeHeaders(resp.headers, `DI81_${operacionId}.txt`);
            descargarBlob(resp.data, filename);
        } catch (e: any) {
            const msg = e?.response?.data?.mensaje || e?.message || "No se pudo generar el archivo.";
            toast.error(msg);
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
                    onReload={() => void cargar()}
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
