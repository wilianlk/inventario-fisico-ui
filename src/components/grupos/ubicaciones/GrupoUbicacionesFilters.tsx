import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DupMode } from "./useGrupoUbicaciones";

interface Props {
    fUbic: string;
    fItem: string;
    fLote: string;
    dupMode: DupMode;
    onUbicChange: (value: string) => void;
    onItemChange: (value: string) => void;
    onLoteChange: (value: string) => void;
    onDupModeChange: (value: DupMode) => void;
    onClear: () => void;
}

export function GrupoUbicacionesFilters({
    fUbic,
    fItem,
    fLote,
    dupMode,
    onUbicChange,
    onItemChange,
    onLoteChange,
    onDupModeChange,
    onClear,
}: Props) {
    return (
        <div className="mb-2 grid grid-cols-1 md:grid-cols-4 gap-2 border rounded p-3">
            <div>
                <Label className="text-xs">Ubicacion</Label>
                <Input
                    value={fUbic}
                    onChange={(e) => onUbicChange(e.target.value)}
                    placeholder="Ej: B102"
                    className="h-9"
                />
            </div>

            <div>
                <Label className="text-xs">Item</Label>
                <Input
                    value={fItem}
                    onChange={(e) => onItemChange(e.target.value)}
                    placeholder="Ej: 005783"
                    className="h-9"
                />
            </div>

            <div>
                <Label className="text-xs">Lote</Label>
                <Input
                    value={fLote}
                    onChange={(e) => onLoteChange(e.target.value)}
                    placeholder="Ej: L123"
                    className="h-9"
                />
            </div>

            <div>
                <Label className="text-xs">Criterio repetido</Label>
                <select
                    value={dupMode}
                    onChange={(e) => onDupModeChange(e.target.value as DupMode)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                >
                    <option value="">Sin criterio</option>
                    <option value="UI">Ubicacion + Item</option>
                    <option value="UIL">Ubicacion + Item + Lote</option>
                </select>
            </div>

            <div className="md:col-span-4 flex justify-end">
                <Button type="button" variant="outline" size="sm" className="h-9" onClick={onClear}>
                    Limpiar
                </Button>
            </div>
        </div>
    );
}
