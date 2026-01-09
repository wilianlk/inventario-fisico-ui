import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { toast } from "react-toastify";

import ConteosHeader from "@/components/conteos/ConteosHeader";
import UbicacionPickerModal from "@/components/conteos/UbicacionPickerModal";
import { useConteoScan } from "@/hooks/useConteoScan";

import { SearchFilters } from "@/components/conteos/ConteoTable";
import { DetalleConteo } from "@/services/conteoService";

type InputSource = "scanner" | "manual";

export type ScanApplyPayload = {
    itemId: number;
    value: number;
    mode: "sum" | "replace";
    nonce: number;
};

export type ConteosScanBlockHandle = {
    markManualIntent: () => void;
    markScannerIntent: () => void;
    afterModalOrDialogClose: () => void;
    focusScanner: () => void;
    getLastScanSource: () => InputSource;
    setLastScanSource: (s: InputSource) => void;
};

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

const ConteosScanBlock = forwardRef<ConteosScanBlockHandle, Props>(function ConteosScanBlock(
    {
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
    },
    ref
) {
    const [scanValue, setScanValue] = useState("");
    const scanValueRef = useRef("");

    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const scanTimerRef = useRef<number | null>(null);

    const lastChangeAtRef = useRef<number>(0);
    const lastLenRef = useRef<number>(0);

    const inputSourceRef = useRef<InputSource>("scanner");
    const lastScanSourceRef = useRef<InputSource>("scanner");

    // umbrales (ms): scanners suelen ir < 30-40ms por char
    const SCAN_FAST_MS = 45;
    const MANUAL_SLOW_MS = 140;

    const markManualIntent = () => {
        inputSourceRef.current = "manual";
    };

    const markScannerIntent = () => {
        inputSourceRef.current = "scanner";
    };

    // si el usuario hace foco/click en otros inputs (tabla), no robamos foco
    useEffect(() => {
        const onFocusIn = (e: FocusEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;

            const scanEl = scanInputRef.current;
            if (scanEl && t === scanEl) return;

            const isEditable =
                t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any).isContentEditable;

            if (isEditable) markManualIntent();
        };

        const onPointerDown = (e: PointerEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;

            const scanEl = scanInputRef.current;
            if (scanEl && t === scanEl) return;

            const isEditable =
                t.tagName === "INPUT" || t.tagName === "TEXTAREA" || (t as any).isContentEditable;

            if (isEditable) markManualIntent();
        };

        window.addEventListener("focusin", onFocusIn, true);
        window.addEventListener("pointerdown", onPointerDown, true);
        return () => {
            window.removeEventListener("focusin", onFocusIn, true);
            window.removeEventListener("pointerdown", onPointerDown, true);
        };
    }, []);

    const focusScanner = () => {
        // “fuerte” para ganar a restoreFocus de Radix
        setTimeout(() => {
            requestAnimationFrame(() => {
                const el = scanInputRef.current;
                if (!el) return;
                el.focus();
                el.select();
            });
        }, 0);
    };

    const clearScanRefsOnly = () => {
        scanValueRef.current = "";
        lastLenRef.current = 0;
    };

    const clearScanAndState = () => {
        scanValueRef.current = "";
        setScanValue("");
        lastLenRef.current = 0;
    };

    const afterModalOrDialogClose = () => {
        // solo devolvemos foco si veníamos de scanner
        if (lastScanSourceRef.current !== "scanner") return;
        clearScanAndState();
        focusScanner();
    };

    useImperativeHandle(
        ref,
        () => ({
            markManualIntent,
            markScannerIntent,
            afterModalOrDialogClose,
            focusScanner,
            getLastScanSource: () => lastScanSourceRef.current,
            setLastScanSource: (s: InputSource) => {
                lastScanSourceRef.current = s;
            },
        }),
        []
    );

    const handleSelectItem = (itemId: number | null) => {
        if (itemId === null) {
            onSelectItem(null);
            return;
        }

        // ✅ AJUSTE CLAVE:
        // Si el último proceso fue scanner, NO dejamos que la tabla robe el foco (Total),
        // porque eso dispara onChange en Total y setTotalField() te limpia Unid.
        if (lastScanSourceRef.current === "scanner") {
            onSelectItem(null);
            return;
        }

        if (inputSourceRef.current === "scanner") {
            onSelectItem(null);
            return;
        }

        onSelectItem(itemId);
    };

    const scan = useConteoScan({
        detalles,
        onSumarCantidad,
        onSelectItem: handleSelectItem,
        onResetBusquedaManual,
        onScanApplied: (itemId, value, opts) => {
            // si se aplicó por scan, es scanner
            markScannerIntent();
            lastScanSourceRef.current = "scanner";

            onScanApplied({
                itemId,
                value,
                mode: opts?.mode ?? "sum",
                nonce: Date.now(),
            });

            if (opts?.mode === "replace") {
                onReplaceFromScan(itemId, value);
            }
        },
    });

    // foco inicial (pero no compite con modal/dialog)
    useEffect(() => {
        if (!hayAlgunoEditable) return;
        if (scan.modalOpen || confirmOpen) return;
        scanInputRef.current?.focus();
    }, [detalles.length, hayAlgunoEditable, scan.modalOpen, confirmOpen]);

    // si el modal se cierra “programático”, igual refocamos (si venía de scanner)
    const prevModalOpenRef = useRef(false);
    useEffect(() => {
        const wasOpen = prevModalOpenRef.current;
        const isOpen = scan.modalOpen;

        if (wasOpen && !isOpen) {
            afterModalOrDialogClose();
        }

        prevModalOpenRef.current = isOpen;
    }, [scan.modalOpen]);

    const procesarScan = async (raw: string, sourceOverride?: InputSource) => {
        const sourceAtStart: InputSource = sourceOverride ?? inputSourceRef.current;
        lastScanSourceRef.current = sourceAtStart;

        if (!hayAlgunoEditable) {
            toast.info("No hay conteos abiertos. Solo lectura.");
            clearScanAndState();
            return;
        }

        const code = (raw || "").trim();
        if (!code) return;

        // ✅ guardamos si realmente se aplicó para decidir limpieza/foco
        let applied = false;

        try {
            const r = await scan.procesarCodigo(code, 1);
            applied = !!r?.applied;

            if (r?.info) toast.info(r.info);
            if (r?.warn) toast.warn(r.warn);
            if (r?.error) toast.error(r.error);
        } catch (e: any) {
            toast.error(e?.message ?? "Error procesando el código.");
        } finally {
            // Evita que el debounce vuelva a disparar
            clearScanRefsOnly();

            // Nunca seleccionar inputs de la tabla al escanear
            onSelectItem(null);

            requestAnimationFrame(() => {
                // 🔒 SOLO si fue scanner, NO hay modal/diálogo, y además el scan APLICÓ
                if (sourceAtStart === "scanner" && applied && !scan.modalOpen && !confirmOpen) {
                    clearScanAndState();
                    focusScanner();
                }
            });
        }
    };

    // debounce auto: SOLO si se detecta scanner
    useEffect(() => {
        if (!hayAlgunoEditable) {
            if (scanTimerRef.current) {
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = null;
            }
            return;
        }

        if (scanTimerRef.current) {
            window.clearTimeout(scanTimerRef.current);
            scanTimerRef.current = null;
        }

        const raw = (scanValueRef.current || "").trim();
        if (!raw) return;

        if (inputSourceRef.current !== "scanner") return;

        scanTimerRef.current = window.setTimeout(() => {
            void procesarScan(raw, "scanner");
        }, 180);

        return () => {
            if (scanTimerRef.current) {
                window.clearTimeout(scanTimerRef.current);
                scanTimerRef.current = null;
            }
        };
    }, [scanValue, hayAlgunoEditable]);

    return (
        <>
            <ConteosHeader
                hayAlgunoEditable={hayAlgunoEditable}
                scanInputRef={scanInputRef}
                scanValue={scanValue}
                onScanChange={(v) => {
                    const now = Date.now();
                    const prevLen = lastLenRef.current;
                    const nextLen = (v || "").length;

                    const dt = lastChangeAtRef.current ? now - lastChangeAtRef.current : 0;
                    const deltaLen = nextLen - prevLen;

                    // Heurística:
                    // - si llega muy rápido o pega varios chars de una => scanner
                    // - si viene lento => manual
                    if (deltaLen > 1) {
                        markScannerIntent();
                    } else if (dt > 0 && dt <= SCAN_FAST_MS) {
                        markScannerIntent();
                    } else if (dt >= MANUAL_SLOW_MS) {
                        markManualIntent();
                    }

                    lastChangeAtRef.current = now;
                    lastLenRef.current = nextLen;

                    scanValueRef.current = v;
                    setScanValue(v);
                }}
                onScanEnter={(v) => {
                    if (scanTimerRef.current) {
                        window.clearTimeout(scanTimerRef.current);
                        scanTimerRef.current = null;
                    }

                    // ✅ AJUSTE CLAVE:
                    // Enter en este input lo tratamos como scanner para que NO robe foco la tabla.
                    markScannerIntent();
                    lastScanSourceRef.current = "scanner";

                    void procesarScan(v, "scanner");
                }}
                busqueda={busqueda}
                onChangeBusqueda={onChangeBusqueda}
                onLimpiarFiltros={onLimpiarFiltros}
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
