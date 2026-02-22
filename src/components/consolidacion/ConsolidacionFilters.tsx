import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ConsolidacionFilters as F } from "@/hooks/consolidacion.logic";

type Props = {
    value: F;
    onChange: (next: F) => void;
    onClear: () => void;
    resumen: { filas: number; ok: number; recontar: number };
};

const ConsolidacionFilters = ({ value, onChange, onClear, resumen }: Props) => {
    return (
        <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
                <Input
                    value={value.operacionId}
                    onChange={(e) => onChange({ ...value, operacionId: e.target.value })}
                    placeholder="Operación ID"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.grupo}
                    onChange={(e) => onChange({ ...value, grupo: e.target.value })}
                    placeholder="Grupo (C1/C2/C3)"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.etiqueta}
                    onChange={(e) => onChange({ ...value, etiqueta: e.target.value })}
                    placeholder="Etiqueta"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.codigoItem}
                    onChange={(e) => onChange({ ...value, codigoItem: e.target.value })}
                    placeholder="Código ítem"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.descripcion}
                    onChange={(e) => onChange({ ...value, descripcion: e.target.value })}
                    placeholder="Descripción"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.udm}
                    onChange={(e) => onChange({ ...value, udm: e.target.value })}
                    placeholder="UdM"
                    className="text-xs sm:text-sm"
                />
                <Input
                    value={value.ubicacion}
                    onChange={(e) => onChange({ ...value, ubicacion: e.target.value })}
                    placeholder="Ubicación"
                    className="text-xs sm:text-sm"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
                <Input
                    value={value.lote}
                    onChange={(e) => onChange({ ...value, lote: e.target.value })}
                    placeholder="Num.Lote"
                    className="text-xs sm:text-sm lg:col-span-2"
                />
                <div className="flex flex-wrap gap-4 items-center text-xs sm:text-sm text-slate-700 lg:col-span-4">
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={value.soloOk}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    soloOk: e.target.checked,
                                    soloRecontar: e.target.checked ? false : value.soloRecontar,
                                })
                            }
                        />
                        Solo OK
                    </label>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={value.soloRecontar}
                            onChange={(e) =>
                                onChange({
                                    ...value,
                                    soloRecontar: e.target.checked,
                                    soloOk: e.target.checked ? false : value.soloOk,
                                })
                            }
                        />
                        Solo Recontar
                    </label>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <div className="text-xs sm:text-sm text-slate-600">
                    Filas: <b>{resumen.filas}</b> · OK: <b>{resumen.ok}</b> · Recontar: <b>{resumen.recontar}</b>
                </div>

                <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={onClear} className="text-xs sm:text-sm">
                        Limpiar
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConsolidacionFilters;
