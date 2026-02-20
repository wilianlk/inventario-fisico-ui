import { forwardRef, useImperativeHandle, type ForwardedRef } from "react";

import ConteosHeader from "@/components/conteos/ConteosHeader";
import UbicacionPickerModal from "@/components/conteos/UbicacionPickerModal";

import { SearchFilters } from "@/components/conteos/ConteoTable";
import { DetalleConteo } from "@/services/conteoService";
import { useConteosScanInput } from "@/components/conteos/useConteosScanInput";
import type { ConteosScanBlockHandle, ScanApplyPayload } from "@/components/conteos/conteosScanTypes";

export type { ConteosScanBlockHandle, ScanApplyPayload } from "@/components/conteos/conteosScanTypes";

interface Props {
    detalles: DetalleConteo[];
    hayAlgunoEditable: boolean;
    confirmOpen: boolean;

    busqueda: SearchFilters;
    onChangeBusqueda: (next: SearchFilters) => void;
    onLimpiarFiltros: () => void;

    onSumarCantidad: (itemId: number, delta: number) => Promise<void>;
    onResetBusquedaManual: () => void;
    onSelectItem: (itemId: number | null) => void;

    onScanApplied: (payload: ScanApplyPayload) => void;
    onReplaceFromScan: (itemId: number, value: number) => void;
}

const ConteosScanBlock = forwardRef(function ConteosScanBlock(
    props: Props,
    ref: ForwardedRef<ConteosScanBlockHandle>
) {
    const {
        detalles,
        hayAlgunoEditable,
        confirmOpen,
        busqueda,
        onChangeBusqueda,
        onLimpiarFiltros,
        onSumarCantidad,
        onResetBusquedaManual,
        onSelectItem,
        onScanApplied,
        onReplaceFromScan,
    } = props;
    const {
        scanInputRef,
        scanValue,
        onScanChange,
        onScanEnter,
        scan,
        busqueda: busquedaState,
        onChangeBusqueda: onChangeBusquedaState,
        onLimpiarFiltros: onLimpiarFiltrosState,
        afterModalOrDialogClose,
        focusScanner,
        markManualIntent,
        markScannerIntent,
        getLastScanSource,
        setLastScanSource,
    } = useConteosScanInput({
        detalles,
        hayAlgunoEditable,
        confirmOpen,
        busqueda,
        onChangeBusqueda,
        onLimpiarFiltros,
        onSumarCantidad,
        onResetBusquedaManual,
        onSelectItem,
        onScanApplied,
        onReplaceFromScan,
    });

    useImperativeHandle(
        ref,
        () => ({
            markManualIntent,
            markScannerIntent,
            afterModalOrDialogClose,
            focusScanner,
            getLastScanSource,
            setLastScanSource,
        }),
        [
            markManualIntent,
            markScannerIntent,
            afterModalOrDialogClose,
            focusScanner,
            getLastScanSource,
            setLastScanSource,
        ]
    );

    return (
        <>
            <ConteosHeader
                hayAlgunoEditable={hayAlgunoEditable}
                scanInputRef={scanInputRef}
                scanValue={scanValue}
                onScanChange={onScanChange}
                onScanEnter={onScanEnter}
                busqueda={busquedaState}
                onChangeBusqueda={onChangeBusquedaState}
                onLimpiarFiltros={onLimpiarFiltrosState}
            />

            <UbicacionPickerModal
                open={hayAlgunoEditable && scan.modalOpen}
                onClose={scan.closeModal}
                onAfterClose={afterModalOrDialogClose}
                pendingKey={scan.pendingKey}
                ubicaciones={scan.ubicaciones}
                ubicCounts={scan.ubicCounts}
                ubicSelected={scan.ubicSelected}
                onSelectUbicacion={scan.selectUbicacion}
                onCambiarUbicacion={() => scan.setUbicSelected(null)}
                filasDeUbicacion={scan.filasDeUbicacion}
                onElegirFila={scan.aplicarConteoEnItem}
            />
        </>
    );
});

export default ConteosScanBlock;
