import { useState } from "react";
import { GrupoConteo, asignarOperacionAGrupo } from "@/services/grupoConteoService";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

interface GrupoAsignarOperacionProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
    onAssigned: () => void;
}

export function GrupoAsignarOperacion({
                                          open,
                                          grupo,
                                          onClose,
                                          onAssigned,
                                      }: GrupoAsignarOperacionProps) {
    const [operacionId, setOperacionId] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!grupo) return null;

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const opId = Number(operacionId);
        if (!opId) return;
        setLoading(true);
        setError(null);
        try {
            await asignarOperacionAGrupo(opId, grupo.id);
            onAssigned();
            onClose();
        } catch {
            setError("Error al asignar la operación.");
            toast.error("No se pudo asignar la operación al grupo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Asignar operación</DialogTitle>
                    <DialogDescription>
                        El grupo seleccionado se asociará a la operación indicada.
                    </DialogDescription>
                </DialogHeader>

                <div className="text-sm text-slate-600 mb-2">
                    Grupo: <span className="font-medium text-slate-900">{grupo.nombre}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="operacionIdAsignar">ID de operación</Label>
                        <Input
                            id="operacionIdAsignar"
                            value={operacionId}
                            onChange={(e) => setOperacionId(e.target.value)}
                            placeholder="Ej: 1001"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {error}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !operacionId.trim()}
                        >
                            {loading ? "Asignando..." : "Asignar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
