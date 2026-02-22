import { ItemConteo } from "@/services/conteoService";
import ConteoTableMobileCards from "@/components/conteos/ConteoTableMobileCards";
import ConteoTableDesktopTable from "@/components/conteos/ConteoTableDesktopTable";
import { useConteoTableState, type SearchFilters, type ScanApply } from "./useConteoTable";

interface Props {
    items: ItemConteo[];
    loading: boolean;
    onUpdateCantidad: (id: number, cantidad: number | null) => Promise<void>;
    conteoId?: number;
    selectedItemId?: number | null;
    searchFilters: SearchFilters;
    editable?: boolean;
    isManaged?: (id: number) => boolean;
    onSetManaged?: (id: number, managed: boolean) => void;
    highlightUnmanaged?: boolean;
    scanApply?: ScanApply;
}

const ConteoTable = ({
    items,
    loading,
    onUpdateCantidad,
    conteoId,
    selectedItemId,
    searchFilters,
    editable = true,
    isManaged,
    onSetManaged,
    highlightUnmanaged = false,
    scanApply = null,
}: Props) => {
    const {
        loading: loadingState,
        editable: editableState,
        locked,
        warnActive,
        rowStateById,
        filtrados,
        getManaged,
        getParts,
        anyManualFilled,
        getTotalDisplay,
        setManualField,
        setTotalField,
        handleKeyDownTotal,
        guardarSiCambia,
        setTotalRef,
        renderRowState,
        toggleNoEncontrado,
        isSaving,
        isMissingConteoId,
    } = useConteoTableState({
        items,
        loading,
        onUpdateCantidad,
        conteoId,
        selectedItemId,
        searchFilters,
        editable,
        isManaged,
        onSetManaged,
        highlightUnmanaged,
        scanApply,
    });

    if (loadingState) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                Cargando ítems...
            </div>
        );
    }

    if (!filtrados || filtrados.length === 0) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                No hay ítems para mostrar.
            </div>
        );
    }

    const Mobile = ConteoTableMobileCards as any;
    const Desktop = ConteoTableDesktopTable as any;

    return (
        <div className="w-full rounded-xl border bg-white p-3 sm:p-4 shadow-sm">
            {!editableState ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Conteo cerrado. Solo lectura.
                </div>
            ) : locked ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Edición bloqueada.
                </div>
            ) : null}

            <Mobile
                items={filtrados}
                selectedItemId={selectedItemId ?? null}
                warnActive={warnActive}
                getManaged={getManaged}
                getParts={getParts}
                anyManualFilled={anyManualFilled}
                getTotalDisplay={getTotalDisplay}
                rowStateById={rowStateById}
                isSaving={isSaving}
                isMissingConteoId={isMissingConteoId}
                locked={locked}
                editable={editableState}
                setManualField={setManualField}
                setTotalField={setTotalField}
                handleKeyDownTotal={handleKeyDownTotal}
                onBlurTotal={guardarSiCambia}
                setTotalRef={setTotalRef}
                renderRowState={renderRowState}
                onToggleNoEncontrado={toggleNoEncontrado}
            />

            <Desktop
                items={filtrados}
                selectedItemId={selectedItemId ?? null}
                warnActive={warnActive}
                getManaged={getManaged}
                getParts={getParts}
                anyManualFilled={anyManualFilled}
                getTotalDisplay={getTotalDisplay}
                rowStateById={rowStateById}
                isSaving={isSaving}
                isMissingConteoId={isMissingConteoId}
                locked={locked}
                editable={editableState}
                setManualField={setManualField}
                setTotalField={setTotalField}
                handleKeyDownTotal={handleKeyDownTotal}
                onBlurTotal={guardarSiCambia}
                setTotalRef={setTotalRef}
                renderRowState={renderRowState}
                onToggleNoEncontrado={toggleNoEncontrado}
            />
        </div>
    );
};

export default ConteoTable;
export type { SearchFilters, ScanApply };
