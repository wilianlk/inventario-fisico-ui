import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { obtenerConteoActual, DetalleConteo } from "@/services/conteoService";
import ConsolidacionFilters from "@/components/consolidacion/ConsolidacionFilters";
import ConsolidacionTable from "@/components/consolidacion/ConsolidacionTable";
import { applyFilters, buildConsolidado, ConsolidacionFilters as FType } from "@/hooks/consolidacion.logic";

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

            <ConsolidacionTable rows={rows} />
        </section>
    );
};

export default Consolidacion;
