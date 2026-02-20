import { Button } from "@/components/ui/button";

interface Props {
    canAgregar: boolean;
    agregando: boolean;
    onCancelar: () => void;
    onAgregar: () => void;
}

export function FooterActions({ canAgregar, agregando, onCancelar, onAgregar }: Props) {
    return (
        <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancelar}>
                Cancelar
            </Button>
            <Button size="sm" disabled={!canAgregar} onClick={onAgregar}>
                {agregando ? "Agregando..." : "Agregar al grupo"}
            </Button>
        </div>
    );
}
