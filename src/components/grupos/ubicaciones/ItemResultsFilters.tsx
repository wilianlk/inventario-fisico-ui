import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Props {
    mostrarLado: boolean;
    filtroUbicacion: string;
    filtroRack: string;
    filtroAltura: string;
    filtroPosicion: string;
    filtroLote: string;
    filtroLado: string;
    filtroDescripcion: string;
    onFiltroUbicacionChange: (value: string) => void;
    onFiltroRackChange: (value: string) => void;
    onFiltroAlturaChange: (value: string) => void;
    onFiltroPosicionChange: (value: string) => void;
    onFiltroLoteChange: (value: string) => void;
    onFiltroLadoChange: (value: string) => void;
    onFiltroDescripcionChange: (value: string) => void;
    onClear: () => void;
}

export function ItemResultsFilters({
    mostrarLado,
    filtroUbicacion,
    filtroRack,
    filtroAltura,
    filtroPosicion,
    filtroLote,
    filtroLado,
    filtroDescripcion,
    onFiltroUbicacionChange,
    onFiltroRackChange,
    onFiltroAlturaChange,
    onFiltroPosicionChange,
    onFiltroLoteChange,
    onFiltroLadoChange,
    onFiltroDescripcionChange,
    onClear,
}: Props) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Filtros sobre resultados</span>
                <Button type="button" size="sm" variant="ghost" onClick={onClear}>
                    Limpiar filtros
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Ubicacion</Label>
                    <Input
                        value={filtroUbicacion}
                        onChange={(e) => onFiltroUbicacionChange(e.target.value)}
                        placeholder="Ej: E424"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Rack</Label>
                    <Input
                        value={filtroRack}
                        onChange={(e) => onFiltroRackChange(e.target.value)}
                        placeholder="Ej: 4"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Altura</Label>
                    <Input
                        value={filtroAltura}
                        onChange={(e) => onFiltroAlturaChange(e.target.value)}
                        placeholder="Ej: 2"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Posicion</Label>
                    <Input
                        value={filtroPosicion}
                        onChange={(e) => onFiltroPosicionChange(e.target.value)}
                        placeholder="Ej: 31"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
            </div>

            <div className={`grid grid-cols-1 ${mostrarLado ? "md:grid-cols-3" : "md:grid-cols-2"} gap-3`}>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Lote</Label>
                    <Input
                        value={filtroLote}
                        onChange={(e) => onFiltroLoteChange(e.target.value)}
                        placeholder="Ej: 490013"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-slate-600">Descripcion</Label>
                    <Input
                        value={filtroDescripcion}
                        onChange={(e) => onFiltroDescripcionChange(e.target.value)}
                        placeholder="Ej: Jab Int"
                        className="text-sm"
                        inputMode="text"
                    />
                </div>
                {mostrarLado && (
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Lado</Label>
                        <Input
                            value={filtroLado}
                            onChange={(e) => onFiltroLadoChange(e.target.value)}
                            placeholder="Ej: A"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
