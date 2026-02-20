import { Button } from "@/components/ui/button";
import ConteoTable, { SearchFilters } from "@/components/conteos/ConteoTable";
import { DetalleConteo, ItemConteo } from "@/services/conteoService";

interface Props {
    detalle: DetalleConteo;
    estado: string;
    editable: boolean;
    finalizando: boolean;
    loadingItems: boolean;

    selectedItemId: number | null;
    searchFilters: SearchFilters;

    onFinalizarClick: (detalle: DetalleConteo) => void;
    onUpdateCantidad: (id: number, cantidad: number) => Promise<void>;

    isManaged: (id: number) => boolean;
    onSetManaged: (id: number, managed: boolean) => void;

    highlightUnmanaged: boolean; // NUEVO

    scanApply?: {
        itemId: number;
        value: number;
        mode: "sum" | "replace";
        nonce: number;
    } | null;
}

export default function ConteoDetalleCard({
                                              detalle,
                                              estado,
                                              editable,
                                              finalizando,
                                              loadingItems,
                                              selectedItemId,
                                              searchFilters,
                                              onFinalizarClick,
                                              onUpdateCantidad,
                                              isManaged,
                                              onSetManaged,
                                              highlightUnmanaged,
                                              scanApply,
                                          }: Props) {
    const key = `${detalle.operacionId}-${detalle.grupoId}-${detalle.numeroConteo}`;

    return (
        <div key={key} className="flex flex-col gap-3 rounded-xl border bg-white p-3 sm:p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="font-semibold">Grupo:</span>
                        <span>{detalle.grupo}</span>
                    </div>
                    <div className="text-slate-600">
                        Operación {detalle.operacionId} · Conteo #{detalle.numeroConteo}
                        {estado ? ` · ${estado}` : ""}
                    </div>
                </div>

                <div className="w-full sm:w-auto">
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => onFinalizarClick(detalle)}
                        disabled={!editable || finalizando}
                        className="w-full sm:w-auto"
                    >
                        {finalizando ? "Finalizando..." : "Finalizar conteo"}
                    </Button>
                </div>
            </div>

            {!editable && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs sm:text-sm text-yellow-900">
                    Conteo cerrado. Solo lectura.
                </div>
            )}

            <ConteoTable
                items={detalle.items as ItemConteo[]}
                loading={loadingItems}
                onUpdateCantidad={onUpdateCantidad}
                conteoId={detalle.conteoId}
                selectedItemId={selectedItemId}
                searchFilters={searchFilters}
                editable={editable}
                isManaged={isManaged}
                onSetManaged={onSetManaged}
                highlightUnmanaged={highlightUnmanaged}
                scanApply={scanApply ?? null}
            />
        </div>
    );
}
