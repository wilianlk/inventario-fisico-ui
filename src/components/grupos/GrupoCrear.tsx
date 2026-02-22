import { useState } from "react";
import { crearGrupo } from "@/services/grupoConteoService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

interface GrupoCrearProps {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
}

export function GrupoCrear({ open, onClose, onCreated }: GrupoCrearProps) {
    const [nombre, setNombre] = useState("");
    const [loading, setLoading] = useState(false);

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setLoading(true);
        try {
            await crearGrupo(nombre.trim());
            setNombre("");
            onCreated();
            onClose();
            toast.success("Grupo creado correctamente.");
        } catch (err: any) {
            const msg =
                err?.response?.data?.mensaje ||
                err?.response?.data?.message ||
                err?.response?.data ||
                "Error al crear el grupo.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Crear nuevo grupo</DialogTitle>
                    <DialogDescription>
                        Define el nombre del grupo de conteo. El nombre no puede repetirse.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-1">
                        <Label htmlFor="nombreGrupo">Nombre del grupo</Label>
                        <Input
                            id="nombreGrupo"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            placeholder="Ej: Grupo A, Grupo Nocturno"
                        />
                    </div>

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
                            disabled={loading || !nombre.trim()}
                        >
                            {loading ? "Creando..." : "Crear grupo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
