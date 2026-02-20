import type { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import type { Bodega } from "./useGrupoUbicacionesAgregarItems";

interface Props {
    bodega: Bodega;
    onBodegaChange: (value: Bodega) => void;
}

export function BodegaSelect({ bodega, onBodegaChange }: Props) {
    const handleBodegaSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const val = (e.target.value || "") as Bodega;
        onBodegaChange(val);
    };

    return (
        <div className="space-y-1">
            <Label className="text-xs text-slate-600">Bodega</Label>
            <select
                value={bodega}
                onChange={handleBodegaSelect}
                className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
                <option value="">Seleccione...</option>
                <option value="11">11 - Recamier</option>
                <option value="13M">13M - CCL</option>
            </select>
        </div>
    );
}
