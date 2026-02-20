import { Button } from "@/components/ui/button";

interface Props {
    grupoNombre?: string;
    totalItems: number;
    totalFiltrados: number;
    onAgregarUbicaciones: () => void;
    onAgregarItems: () => void;
    disabled: boolean;
}

export function GrupoUbicacionesHeader({
    grupoNombre,
    totalItems,
    totalFiltrados,
    onAgregarUbicaciones,
    onAgregarItems,
    disabled,
}: Props) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center mb-2 text-sm">
            <div className="space-x-2">
                <span>
                    Grupo: <span className="font-medium">{grupoNombre || "-"}</span>
                </span>
                <span className="text-xs text-slate-500">Total: {totalItems}</span>
                <span className="text-xs text-slate-500">Filtrados: {totalFiltrados}</span>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    size="sm"
                    onClick={onAgregarUbicaciones}
                    className="rounded-full h-8 px-3 text-xs"
                    disabled={disabled}
                >
                    Asignar ubicaciones
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onAgregarItems}
                    className="rounded-full h-8 px-3 text-xs"
                    disabled={disabled}
                >
                    Agregar items
                </Button>
            </div>
        </div>
    );
}
