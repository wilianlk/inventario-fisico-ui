import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
    usuarioId: string;
    usuarioNombre: string;
    canAdd: boolean;
    loadingAdd: boolean;
    onUsuarioIdChange: (value: string) => void;
    onUsuarioNombreChange: (value: string) => void;
    onSubmit: (e: React.FormEvent) => void;
}

export function GrupoPersonasForm({
    usuarioId,
    usuarioNombre,
    canAdd,
    loadingAdd,
    onUsuarioIdChange,
    onUsuarioNombreChange,
    onSubmit,
}: Props) {
    return (
        <form
            onSubmit={onSubmit}
            className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"
        >
            <div className="flex-1 min-w-[120px]">
                <Label htmlFor="usuarioId" className="text-xs text-slate-600 mb-1">
                    ID usuario
                </Label>
                <Input
                    id="usuarioId"
                    className="text-sm"
                    value={usuarioId}
                    onChange={(e) => onUsuarioIdChange(e.target.value)}
                    placeholder="Ej: 12345"
                    inputMode="numeric"
                />
            </div>
            <div className="flex-1 min-w-[160px]">
                <Label htmlFor="usuarioNombre" className="text-xs text-slate-600 mb-1">
                    Nombre usuario
                </Label>
                <Input
                    id="usuarioNombre"
                    className="text-sm"
                    value={usuarioNombre}
                    onChange={(e) => onUsuarioNombreChange(e.target.value)}
                    placeholder="Ej: Juan Perez"
                />
            </div>
            <Button type="submit" size="sm" disabled={!canAdd} className="rounded-full h-8 px-4 text-xs">
                {loadingAdd ? "Agregando..." : "Agregar"}
            </Button>
        </form>
    );
}
