interface Props {
    show: boolean;
}

export function GrupoPersonasEmptyState({ show }: Props) {
    if (!show) return null;

    return (
        <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="text-sm font-semibold text-amber-900">Este grupo no tiene personas</div>
            <div className="text-xs text-amber-900/80 mt-1">
                Agrega al menos una persona para que el grupo pueda participar y permitir el cierre de la operacion.
            </div>
        </div>
    );
}
