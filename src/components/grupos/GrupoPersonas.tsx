import { GrupoConteo } from "@/services/grupoConteoService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useGrupoPersonas } from "./personas/useGrupoPersonas";
import { GrupoPersonasHeader } from "./personas/GrupoPersonasHeader";
import { GrupoPersonasEmptyState } from "./personas/GrupoPersonasEmptyState";
import { GrupoPersonasForm } from "./personas/GrupoPersonasForm";
import { GrupoPersonasTable } from "./personas/GrupoPersonasTable";

interface GrupoPersonasProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

export function GrupoPersonas({ open, grupo, onClose }: GrupoPersonasProps) {
    const {
        personas,
        loading,
        loadingAdd,
        loadingDeleteId,
        usuarioId,
        usuarioNombre,
        error,
        canAdd,
        emptyState,
        setUsuarioId,
        setUsuarioNombre,
        handleOpenChange,
        handleAgregar,
        handleEliminar,
        load,
    } = useGrupoPersonas({ open, grupo, onClose });

    if (!grupo) {
        return (
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Personas del grupo</DialogTitle>
                        <DialogDescription>
                            Selecciona un grupo para administrar sus personas.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Personas del grupo</DialogTitle>
                    <DialogDescription>
                        Administra los usuarios asignados al grupo seleccionado.
                    </DialogDescription>
                </DialogHeader>

                <GrupoPersonasHeader
                    grupoNombre={grupo.nombre}
                    personasCount={personas.length}
                    loading={loading}
                    loadingAdd={loadingAdd}
                    onRefresh={load}
                />

                {error ? (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                        {error}
                    </div>
                ) : null}

                <GrupoPersonasEmptyState show={emptyState} />

                <GrupoPersonasForm
                    usuarioId={usuarioId}
                    usuarioNombre={usuarioNombre}
                    canAdd={canAdd}
                    loadingAdd={loadingAdd}
                    onUsuarioIdChange={setUsuarioId}
                    onUsuarioNombreChange={setUsuarioNombre}
                    onSubmit={handleAgregar}
                />

                <GrupoPersonasTable
                    personas={personas}
                    loading={loading}
                    loadingDeleteId={loadingDeleteId}
                    onEliminar={handleEliminar}
                />
            </DialogContent>
        </Dialog>
    );
}
