import { GrupoConteo } from "@/services/grupoConteoService";
import type { ItemBusquedaPorItem } from "@/services/grupoUbicacionService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { BodegaSelect } from "./ubicaciones/BodegaSelect";
import { ItemSearchFields } from "./ubicaciones/ItemSearchFields";
import { ItemResultsTable } from "./ubicaciones/ItemResultsTable";
import { ItemResultsFilters } from "./ubicaciones/ItemResultsFilters";
import { FooterActions } from "./ubicaciones/FooterActions";
import { Button } from "@/components/ui/button";
import { useGrupoUbicacionesAgregarItems } from "./ubicaciones/useGrupoUbicacionesAgregarItems";

interface Props {
    open: boolean;
    grupo: GrupoConteo;
    onClose: () => void;
    onAfterAdd: () => void;
    onSetParentError: (msg: string | null) => void;
}

export function GrupoUbicacionesAgregarItemsDialog({ open, grupo, onClose, onAfterAdd, onSetParentError }: Props) {
    const {
        bodega,
        itemCodigo,
        itemLote,
        itemResults,
        filteredItemResults,
        itemLoading,
        itemError,
        itemSelected,
        agregando,
        selectedCount,
        selectedVisibleCount,
        allItemsSelected,
        hasActiveFilters,
        filtroUbicacion,
        filtroRack,
        filtroAltura,
        filtroPosicion,
        filtroLote,
        filtroLado,
        filtroDescripcion,
        canBuscarItem,
        canAgregar,
        mostrarLado,
        handleOpenChange,
        handleBodegaChange,
        handleItemCodigoChange,
        handleItemLoteChange,
        handleBuscarItem,
        handleConfirmarAgregar,
        buildItemKey,
        toggleSelectAll,
        toggleItemSelection,
        clearItemFilters,
        clearHiddenSelections,
        setFiltroUbicacion,
        setFiltroRack,
        setFiltroAltura,
        setFiltroPosicion,
        setFiltroLote,
        setFiltroLado,
        setFiltroDescripcion,
        N,
    } = useGrupoUbicacionesAgregarItems({
        grupoId: grupo.id,
        onAfterAdd,
        onSetParentError,
        onClose,
    });

    const isSelected = (it: ItemBusquedaPorItem) => !!itemSelected[buildItemKey(it)];

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Agregar items</DialogTitle>
                    <DialogDescription>
                        Busca por codigo de item y agrega las ubicaciones encontradas al grupo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mb-3">
                    <BodegaSelect bodega={bodega} onBodegaChange={handleBodegaChange} />

                    <ItemSearchFields
                        itemCodigo={itemCodigo}
                        itemLote={itemLote}
                        onItemCodigoChange={handleItemCodigoChange}
                        onItemLoteChange={handleItemLoteChange}
                    />

                    {itemError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {itemError}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="button" size="sm" variant="outline" onClick={handleBuscarItem} disabled={!canBuscarItem}>
                            {itemLoading ? "Buscando..." : "Buscar por item"}
                        </Button>
                    </div>
                </div>

                {itemResults.length > 0 && (
                    <div className="mb-3">
                        <ItemResultsFilters
                            mostrarLado={mostrarLado}
                            filtroUbicacion={filtroUbicacion}
                            filtroRack={filtroRack}
                            filtroAltura={filtroAltura}
                            filtroPosicion={filtroPosicion}
                            filtroLote={filtroLote}
                            filtroLado={filtroLado}
                            filtroDescripcion={filtroDescripcion}
                            onFiltroUbicacionChange={setFiltroUbicacion}
                            onFiltroRackChange={setFiltroRack}
                            onFiltroAlturaChange={setFiltroAltura}
                            onFiltroPosicionChange={setFiltroPosicion}
                            onFiltroLoteChange={setFiltroLote}
                            onFiltroLadoChange={setFiltroLado}
                            onFiltroDescripcionChange={setFiltroDescripcion}
                            onClear={clearItemFilters}
                        />
                    </div>
                )}

                {itemResults.length > 0 && filteredItemResults.length === 0 && (
                    <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                        No hay items con esos filtros.
                    </div>
                )}

                {hasActiveFilters &&
                    selectedCount > 0 &&
                    selectedVisibleCount < selectedCount &&
                    filteredItemResults.length > 0 && (
                        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
                            <div>
                                Hay {selectedCount - selectedVisibleCount} seleccionados que no se ven por los filtros.
                            </div>
                            <div className="mt-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={clearHiddenSelections}
                                >
                                    Limpiar seleccion oculta
                                </Button>
                            </div>
                        </div>
                    )}

                <ItemResultsTable
                    items={filteredItemResults}
                    totalItems={itemResults.length}
                    mostrarLado={mostrarLado}
                    selectedCount={selectedCount}
                    selectedVisibleCount={selectedVisibleCount}
                    hasActiveFilters={hasActiveFilters}
                    allSelected={allItemsSelected}
                    onToggleAll={toggleSelectAll}
                    onToggleOne={toggleItemSelection}
                    getKey={buildItemKey}
                    normalize={N}
                    isSelected={isSelected}
                />

                <FooterActions
                    canAgregar={canAgregar}
                    agregando={agregando}
                    onCancelar={() => handleOpenChange(false)}
                    onAgregar={handleConfirmarAgregar}
                />
            </DialogContent>
        </Dialog>
    );
}
