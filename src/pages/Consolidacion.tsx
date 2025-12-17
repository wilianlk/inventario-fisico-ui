import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { obtenerConteoActual, DetalleConteo } from "@/services/conteoService";
import { cerrarOperacion } from "@/services/inventarioService";
import { generarDI81 } from "@/services/consolidacionService";
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

    const cargar = async () => {
        setLoading(true);
        try {
            const resp = await obtenerConteoActual();
            setDetalles(resp.data ?? []);
        } catch (e) {
            console.error(e);
            toast.error("No se pudo cargar la consolidación.");
            setDetalles([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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

    const getOperacionId = (): number | null => {
        const id = (detalles as any[])[0]?.operacionId;
        return id !== null && id !== undefined ? Number(id) : null;
    };

    const esYaCerrada = (msg: string) => {
        const m = (msg || "").toLowerCase();
        return m.includes("cerrad") && m.includes("ya");
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

    const nombreDesdeHeaders = (headers: any, fallback: string) => {
        const cd = headers?.["content-disposition"] || headers?.["Content-Disposition"] || "";
        const match = String(cd).match(/filename="?([^"]+)"?/i);
        return match?.[1] || fallback;
    };

    const finalizar = async () => {
        const operacionId = getOperacionId();

        if (!operacionId) {
            toast.error("No hay operación cargada para finalizar.");
            return;
        }

        try {
            setFinalizando(true);

            try {
                await cerrarOperacion(operacionId);
            } catch (e: any) {
                const msg = e?.response?.data?.mensaje || e?.message || "Error al cerrar la operación.";
                if (!esYaCerrada(msg)) throw e;
            }

            const resp = await generarDI81(operacionId);
            const filename = nombreDesdeHeaders(resp.headers, `DI81_${operacionId}.txt`);
            descargarBlob(resp.data, filename);

            toast.success("Inventario finalizado. Archivo DI81 generado.");
            setOpenFinalizar(false);
            void cargar();
        } catch (e: any) {
            const msg = e?.response?.data?.mensaje || e?.message || "Error inesperado.";
            toast.error(msg);
        } finally {
            setFinalizando(false);
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

            <div className="flex justify-end px-4 sm:px-6">
                <div className="mx-auto max-w-[1700px] w-full flex justify-end">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                        onClick={() => {
                            const operacionId = getOperacionId();
                            if (!operacionId) {
                                toast.error("No hay operación cargada para finalizar.");
                                return;
                            }
                            setOpenFinalizar(true);
                        }}
                    >
                        Finalizar
                    </button>
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
