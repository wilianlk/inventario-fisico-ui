import { GrupoConteo } from "@/services/grupoConteoService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { BodegaFilters } from "./ubicaciones/BodegaFilters";
import { PreviewResultsTable } from "./ubicaciones/PreviewResultsTable";
import { FooterActions } from "./ubicaciones/FooterActions";
import { useGrupoUbicacionesAgregarFiltros } from "./ubicaciones/useGrupoUbicacionesAgregarFiltros";
import { Button } from "@/components/ui/button";

interface Props {
    open: boolean;
    grupo: GrupoConteo;
    onClose: () => void;
    onAfterAdd: () => void;
    onSetParentError: (msg: string | null) => void;
}

export function GrupoUbicacionesAgregarDialog({ open, grupo, onClose, onAfterAdd, onSetParentError }: Props) {
    const {
        bodega,
        rack11,
        altura11,
        ubic11,
        rack13,
        lado13,
        altura13,
        ubic13,
        previewItems,
        previewLoading,
        previewError,
        previewStale,
        agregando,
        ubicacionesMaterializadas,
        canBuscar,
        canAgregar,
        mostrarLado,
        handleOpenChange,
        handleBodegaChange,
        handleRack11Change,
        handleAltura11Change,
        handleUbic11Change,
        handleRack13Change,
        handleLado13Change,
        handleAltura13Change,
        handleUbic13Change,
        handleBuscar,
        handleConfirmarAgregar,
        N,
    } = useGrupoUbicacionesAgregarFiltros({
        grupoId: grupo.id,
        onAfterAdd,
        onSetParentError,
        onClose,
    });

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Asignar ubicaciones</DialogTitle>
                    <DialogDescription>
                        Selecciona bodega y filtros para previsualizar. Luego agrega al grupo
                        las ubicaciones resultantes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleBuscar} className="space-y-4 mb-3">
                    <BodegaFilters
                        bodega={bodega}
                        rack11={rack11}
                        altura11={altura11}
                        ubic11={ubic11}
                        rack13={rack13}
                        lado13={lado13}
                        altura13={altura13}
                        ubic13={ubic13}
                        onBodegaChange={handleBodegaChange}
                        onRack11Change={handleRack11Change}
                        onAltura11Change={handleAltura11Change}
                        onUbic11Change={handleUbic11Change}
                        onRack13Change={handleRack13Change}
                        onLado13Change={handleLado13Change}
                        onAltura13Change={handleAltura13Change}
                        onUbic13Change={handleUbic13Change}
                    />

                    {previewError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {previewError}
                        </div>
                    )}
                    {previewStale && !previewError && (
                        <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            Resultados desactualizados. Vuelve a buscar para actualizar.
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={!canBuscar}>
                            {previewLoading ? "Buscando..." : "Buscar"}
                        </Button>
                    </div>
                </form>

                <PreviewResultsTable
                    items={previewItems}
                    mostrarLado={mostrarLado}
                    ubicacionesCount={ubicacionesMaterializadas.length}
                    normalize={N}
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
