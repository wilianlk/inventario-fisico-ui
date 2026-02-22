import { useEffect, useRef } from "react";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { GrupoUbicacionesAgregarDialog } from "./GrupoUbicacionesAgregarDialog";
import { GrupoUbicacionesAgregarItemsDialog } from "./GrupoUbicacionesAgregarItemsDialog";
import { useGrupoUbicaciones } from "./ubicaciones/useGrupoUbicaciones";
import { GrupoUbicacionesHeader } from "./ubicaciones/GrupoUbicacionesHeader";
import { GrupoUbicacionesFilters } from "./ubicaciones/GrupoUbicacionesFilters";
import { GrupoUbicacionesTable } from "./ubicaciones/GrupoUbicacionesTable";
import { toast } from "react-toastify";

interface GrupoUbicacionesProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export function GrupoUbicaciones({ open, grupo, onClose }: GrupoUbicacionesProps) {
    const lastErrorRef = useRef<string | null>(null);
    const {
        itemsVista,
        loading,
        error,
        setError,
        mostrarLado,
        totalItems,
        totalFiltrados,
        fUbic,
        fItem,
        fLote,
        dupMode,
        setFUbic,
        setFItem,
        setFLote,
        setDupMode,
        clearFilters,
        agregarUbicacionesOpen,
        setAgregarUbicacionesOpen,
        agregarItemsOpen,
        setAgregarItemsOpen,
        handleQuitarUbicacion,
        handleOpenChange,
        load,
        N,
        dupCount,
    } = useGrupoUbicaciones({ open, grupo, onClose });

    useEffect(() => {
        if (!error) return;
        if (lastErrorRef.current === error) return;
        lastErrorRef.current = error;
        toast.error(error);
    }, [error]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-6xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Ubicaciones del grupo</DialogTitle>
                    <DialogDescription>Items resultantes de los filtros asignados al grupo.</DialogDescription>
                </DialogHeader>

                <GrupoUbicacionesHeader
                    grupoNombre={grupo?.nombre}
                    totalItems={totalItems}
                    totalFiltrados={totalFiltrados}
                    onAgregarUbicaciones={() => setAgregarUbicacionesOpen(true)}
                    onAgregarItems={() => setAgregarItemsOpen(true)}
                    disabled={!grupo}
                />

                <GrupoUbicacionesFilters
                    fUbic={fUbic}
                    fItem={fItem}
                    fLote={fLote}
                    dupMode={dupMode}
                    onUbicChange={setFUbic}
                    onItemChange={setFItem}
                    onLoteChange={setFLote}
                    onDupModeChange={setDupMode}
                    onClear={clearFilters}
                />

                <GrupoUbicacionesTable
                    items={itemsVista}
                    loading={loading}
                    mostrarLado={mostrarLado}
                    dupMode={dupMode}
                    dupCount={dupCount}
                    onQuitar={handleQuitarUbicacion}
                    disabled={!grupo}
                    normalize={N}
                />

                {grupo && (
                    <GrupoUbicacionesAgregarDialog
                        open={agregarUbicacionesOpen}
                        grupo={grupo}
                        onClose={() => setAgregarUbicacionesOpen(false)}
                        onAfterAdd={load}
                        onSetParentError={setError}
                    />
                )}

                {grupo && (
                    <GrupoUbicacionesAgregarItemsDialog
                        open={agregarItemsOpen}
                        grupo={grupo}
                        onClose={() => setAgregarItemsOpen(false)}
                        onAfterAdd={load}
                        onSetParentError={setError}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
