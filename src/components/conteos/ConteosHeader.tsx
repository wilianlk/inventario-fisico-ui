import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchFilters } from "@/components/conteos/ConteoTable";
import { RefObject, useEffect } from "react";

interface Props {
    hayAlgunoEditable: boolean;
    scanInputRef: RefObject<HTMLInputElement | null>;
    scanValue: string;
    onScanChange: (v: string) => void;
    onScanEnter: (v: string) => void;

    busqueda: SearchFilters;
    onChangeBusqueda: (next: SearchFilters) => void;

    onLimpiarFiltros: () => void;
}

export default function ConteosHeader({
                                          hayAlgunoEditable,
                                          scanInputRef,
                                          scanValue,
                                          onScanChange,
                                          onScanEnter,
                                          busqueda,
                                          onChangeBusqueda,
                                          onLimpiarFiltros,
                                      }: Props) {
    const focusScanner = () => {
        if (!hayAlgunoEditable) return;
        requestAnimationFrame(() => {
            const el = scanInputRef?.current;
            if (!el) return;
            el.focus();
            el.select();
        });
    };

    useEffect(() => {
        if (scanValue === "") focusScanner();
    }, [scanValue, hayAlgunoEditable]);

    return (
        <header className="space-y-4">
            <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                    Conteo manual de inventario
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                    Escanea el <b>código</b> para registrar automáticamente. Si el código incluye{" "}
                    <b>cantidad</b>, se suma esa cantidad. Si está en varias ubicaciones, selecciona
                    ubicación/fila en pantalla.
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
                        <div className="text-[11px] sm:text-xs font-medium text-slate-700">
                            Escáner (código / etiqueta)
                        </div>

                        <Input
                            ref={scanInputRef}
                            value={scanValue}
                            disabled={!hayAlgunoEditable}
                            onChange={(e) => onScanChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key !== "Enter") return;
                                e.preventDefault();
                                const v = (e.currentTarget.value || "").trim();
                                if (!v) return;
                                onScanEnter(v);
                            }}
                            placeholder="Escanea el código"
                            className="text-xs sm:text-sm"
                            autoComplete="off"
                        />
                    </div>

                    <div className="flex flex-col gap-2 w-full md:w-44 md:items-stretch shrink-0">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                onLimpiarFiltros();
                                setTimeout(focusScanner, 0);
                            }}
                            className="text-xs sm:text-sm w-full"
                        >
                            Limpiar filtros
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="text-[11px] sm:text-xs font-medium text-slate-700">
                        Búsqueda manual
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        <Input
                            value={busqueda.etiqueta}
                            onChange={(e) => onChangeBusqueda({ ...busqueda, etiqueta: e.target.value })}
                            placeholder="Etiqueta"
                            className="text-xs sm:text-sm"
                        />
                        <Input
                            value={busqueda.codigoItem}
                            onChange={(e) => onChangeBusqueda({ ...busqueda, codigoItem: e.target.value })}
                            placeholder="Código ítem"
                            className="text-xs sm:text-sm"
                        />
                        <Input
                            value={busqueda.descripcion}
                            onChange={(e) => onChangeBusqueda({ ...busqueda, descripcion: e.target.value })}
                            placeholder="Descripción"
                            className="text-xs sm:text-sm"
                        />
                        <Input
                            value={busqueda.lote}
                            onChange={(e) => onChangeBusqueda({ ...busqueda, lote: e.target.value })}
                            placeholder="Lote"
                            className="text-xs sm:text-sm"
                        />
                        <Input
                            value={busqueda.ubicacion}
                            onChange={(e) => onChangeBusqueda({ ...busqueda, ubicacion: e.target.value })}
                            placeholder="Ubicación"
                            className="text-xs sm:text-sm"
                        />
                    </div>
                </div>
            </div>
        </header>
    );
}
