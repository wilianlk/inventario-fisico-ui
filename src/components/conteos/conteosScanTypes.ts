export type InputSource = "scanner" | "manual";

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
