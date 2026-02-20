import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bodega } from "./useGrupoUbicacionesAgregarFiltros";

interface Props {
    bodega: Bodega;
    rack11: string;
    altura11: string;
    ubic11: string;
    rack13: string;
    lado13: "" | "A" | "B";
    altura13: string;
    ubic13: string;
    onBodegaChange: (value: Bodega) => void;
    onRack11Change: (value: string) => void;
    onAltura11Change: (value: string) => void;
    onUbic11Change: (value: string) => void;
    onRack13Change: (value: string) => void;
    onLado13Change: (value: "" | "A" | "B") => void;
    onAltura13Change: (value: string) => void;
    onUbic13Change: (value: string) => void;
}

export function BodegaFilters({
    bodega,
    rack11,
    altura11,
    ubic11,
    rack13,
    lado13,
    altura13,
    ubic13,
    onBodegaChange,
    onRack11Change,
    onAltura11Change,
    onUbic11Change,
    onRack13Change,
    onLado13Change,
    onAltura13Change,
    onUbic13Change,
}: Props) {
    const handleBodegaSelect = (e: ChangeEvent<HTMLSelectElement>) => {
        const val = (e.target.value || "") as Bodega;
        onBodegaChange(val);
    };

    return (
        <>
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

            {bodega === "11" ? (
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Rack/Pasillo</Label>
                        <Input
                            value={rack11}
                            onChange={(e) => onRack11Change(e.target.value)}
                            placeholder="Ej: B"
                            className="text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Altura</Label>
                        <Input
                            value={altura11}
                            onChange={(e) => onAltura11Change(e.target.value)}
                            placeholder="Ej: 2"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Ubicacion</Label>
                        <Input
                            value={ubic11}
                            onChange={(e) => onUbic11Change(e.target.value)}
                            placeholder="Ej: 31"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                </div>
            ) : bodega === "13M" ? (
                <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Rack/Pasillo</Label>
                        <Input
                            value={rack13}
                            onChange={(e) => onRack13Change(e.target.value)}
                            placeholder="Ej: 07"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Lado</Label>
                        <select
                            value={lado13}
                            onChange={(e) => onLado13Change((e.target.value || "").toUpperCase() as any)}
                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="">Seleccione...</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Altura</Label>
                        <Input
                            value={altura13}
                            onChange={(e) => onAltura13Change(e.target.value)}
                            placeholder="Ej: 6"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Ubicacion</Label>
                        <Input
                            value={ubic13}
                            onChange={(e) => onUbic13Change(e.target.value)}
                            placeholder="Ej: 41"
                            className="text-sm"
                            inputMode="text"
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
}
