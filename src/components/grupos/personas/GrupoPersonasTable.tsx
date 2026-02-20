import { Button } from "@/components/ui/button";
import type { GrupoPersona } from "@/services/grupoPersonaService";

interface Props {
    personas: GrupoPersona[];
    loading: boolean;
    loadingDeleteId: number | null;
    onEliminar: (persona: GrupoPersona) => void;
}

export function GrupoPersonasTable({ personas, loading, loadingDeleteId, onEliminar }: Props) {
    return (
        <div className="flex-1 overflow-auto border border-slate-200 rounded-2xl">
            {loading ? (
                <div className="p-4 text-sm text-slate-600">Cargando...</div>
            ) : personas.length === 0 ? (
                <div className="p-6 text-center">
                    <div className="text-sm font-semibold text-slate-900">No hay personas</div>
                    <div className="text-xs text-slate-600 mt-1">
                        Agrega una persona usando el formulario superior.
                    </div>
                </div>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">ID</th>
                            <th className="px-3 py-2 text-left font-medium">Usuario</th>
                            <th className="px-3 py-2 text-left font-medium">Nombre</th>
                            <th className="px-3 py-2 text-right font-medium">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {personas.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-700">{p.id}</td>
                                <td className="px-3 py-2 text-slate-700">{p.usuarioId}</td>
                                <td className="px-3 py-2 text-slate-900">{p.usuarioNombre}</td>
                                <td className="px-3 py-2 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-xs text-red-600 hover:text-red-700"
                                        onClick={() => onEliminar(p)}
                                        disabled={loadingDeleteId === p.usuarioId}
                                    >
                                        {loadingDeleteId === p.usuarioId ? "Eliminando..." : "Eliminar"}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
