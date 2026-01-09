import ConteoDetalleCard from "@/components/conteos/ConteoDetalleCard";
import { SearchFilters } from "@/components/conteos/ConteoTable";
import { DetalleConteo } from "@/services/conteoService";

interface Props {
    loadingDetalle: boolean;
    detalles: DetalleConteo[];

    estadoByDetalleKey: Record<string, string>;
    editableDetalle: (d: DetalleConteo) => boolean;

    finalizandoByConteoId: Record<number, boolean>;
    highlightByConteoId: Record<number, boolean>;

    loadingItems: boolean;
    selectedItemId: number | null;
    searchFilters: SearchFilters;

    onFinalizarClick: (detalle: DetalleConteo) => void;
    onUpdateCantidad: (itemId: number, cantidad: number) => Promise<void>;

    isManaged: (itemId: number) => boolean;
    onSetManaged: (itemId: number, managed: boolean) => void;

    scanApply: {
        itemId: number;
        value: number;
        mode: "sum" | "replace";
        nonce: number;
    } | null;
}

export default function ConteosDetalleList({
                                               loadingDetalle,
                                               detalles,
                                               estadoByDetalleKey,
                                               editableDetalle,
                                               finalizandoByConteoId,
                                               highlightByConteoId,
                                               loadingItems,
                                               selectedItemId,
                                               searchFilters,
                                               onFinalizarClick,
                                               onUpdateCantidad,
                                               isManaged,
                                               onSetManaged,
                                               scanApply,
                                           }: Props) {
    if (loadingDetalle) {
        return (
            <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm text-xs sm:text-sm text-slate-500">
                Cargando conteos actuales...
            </div>
        );
    }

    if (detalles.length === 0) {
        return (
            <div className="rounded-xl border bg-white p-3 sm:p-4 shadow-sm text-xs sm:text-sm text-slate-500">
                No hay conteos pendientes para mostrar.
            </div>
        );
    }

    return (
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
                        searchFilters={searchFilters}
                        onFinalizarClick={onFinalizarClick}
                        onUpdateCantidad={onUpdateCantidad}
                        isManaged={isManaged}
                        onSetManaged={onSetManaged}
                        highlightUnmanaged={highlight}
                        scanApply={scanApply}
                    />
                );
            })}
        </div>
    );
}
