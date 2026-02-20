import { Button } from "@/components/ui/button";

interface Props {
    grupoNombre?: string;
    personasCount: number;
    loading: boolean;
    loadingAdd: boolean;
    onRefresh: () => void;
}

export function GrupoPersonasHeader({
    grupoNombre,
    personasCount,
    loading,
    loadingAdd,
    onRefresh,
}: Props) {
    return (
        <div className="flex items-start justify-between gap-3 mb-2 text-sm text-slate-600">
            <div className="space-y-1">
                <div>
                    Grupo: <span className="font-medium text-slate-900">{grupoNombre || "-"}</span>
                </div>
                <div className="text-xs text-slate-500">
                    {personasCount === 0 ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-900">
                            Sin personas
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-700">
                            {personasCount} personas
                        </span>
                    )}
                </div>
            </div>

            <Button
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={loading || loadingAdd}
                className="rounded-full h-8 px-3 text-xs"
            >
                Actualizar
            </Button>
        </div>
    );
}
