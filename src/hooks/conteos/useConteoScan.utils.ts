import type { ParsedScan } from "./useConteoScan.types";

export const norm = (raw: string) => (raw ?? "").replace(/\r?\n/g, "").trim();

export const round4 = (n: number) => Math.round(n * 10000) / 10000;

export const parseCantidadNumber = (rawQty?: string): number | null => {
    const s0 = (rawQty ?? "").trim();
    if (!s0) return null;
    const s = s0.replace(",", ".");
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const r = round4(n);
    return r < 0 ? 0 : r;
};

export const getIncrementoFromScan = (p: ParsedScan): number | null => {
    const byCantidad = parseCantidadNumber(p.cantidad);
    if (byCantidad !== null) return byCantidad;
    const byUnidad = parseCantidadNumber(p.unidad);
    if (byUnidad !== null) return byUnidad;
    return null;
};

export const parseScan = (raw: string): ParsedScan => {
    const cleaned = norm(raw);
    const compact = cleaned.replace(/\s+/g, "");
    const digitsOnly = compact.replace(/\D/g, "");

    if (digitsOnly.length === 20) {
        const codigoItem = digitsOnly.slice(0, 6);
        const lote = digitsOnly.slice(6, 12);
        const orden = digitsOnly.slice(12, 18);
        const unidad = digitsOnly.slice(18, 20);
        return { raw: cleaned, codigoItem, lote, orden, unidad, cantidad: unidad };
    }

    if (digitsOnly.length >= 20) {
        const codeLen = 7;
        const restLen = digitsOnly.length - codeLen;
        if (restLen > 12) {
            const codigoItem = digitsOnly.slice(0, codeLen);
            const lote = digitsOnly.slice(codeLen, codeLen + 6);
            const orden = digitsOnly.slice(codeLen + 6, codeLen + 12);
            const cantidad = digitsOnly.slice(codeLen + 12);
            return { raw: cleaned, codigoItem, lote, orden, cantidad };
        }
    }

    const mIdx = compact.toLowerCase().indexOf("m");
    if (mIdx > 0) {
        const left = compact.slice(0, mIdx);
        const right = compact.slice(mIdx + 1);
        const itemDigits = left.replace(/\D/g, "");
        const rightDigits = right.replace(/[^\d.]/g, "");

        const loteDigits = rightDigits.slice(0, 6).replace(/\D/g, "");
        const ordenDigits = rightDigits.slice(6, 12).replace(/\D/g, "");
        const cantidad = rightDigits.slice(12);

        const lote = loteDigits ? `m${loteDigits}` : undefined;
        const loteAlt = loteDigits || undefined;

        return {
            raw: cleaned,
            codigoItem: itemDigits || digitsOnly || cleaned,
            lote,
            loteAlt,
            orden: ordenDigits || undefined,
            cantidad: cantidad || undefined,
        };
    }

    if (digitsOnly.length >= 1) {
        return { raw: cleaned, codigoItem: digitsOnly.slice(0, 7) };
    }

    return { raw: cleaned, codigoItem: cleaned };
};

export const buildPendingKey = (p: ParsedScan) => {
    const code = (p.codigoItem || "").trim();
    if (!code) return "";
    const lote = (p.lote || "").trim();
    const loteAlt = (p.loteAlt || "").trim();
    const loteShow = lote || loteAlt;
    return loteShow ? `${code} · Lote ${loteShow}` : code;
};

export const resolveByKnownCodes = (
    raw: string,
    knownCodes: string[]
): ParsedScan | null => {
    const cleaned = norm(raw);
    if (!cleaned) return null;

    const compact = cleaned.replace(/\s+/g, "");
    const digits = compact.replace(/\D/g, "");

    let best: string | null = null;
    let mode: "compact" | "digits" = "compact";

    for (const code of knownCodes) {
        if (compact.startsWith(code)) {
            best = code;
            mode = "compact";
            break;
        }
        if (digits.startsWith(code)) {
            best = code;
            mode = "digits";
            break;
        }
    }

    if (!best) return null;

    if (mode === "compact") {
        const rest = compact.slice(best.length);
        const m = rest.match(/(\d+(?:[.,]\d+)?)$/);
        const qty = m?.[1] ?? undefined;

        let lote: string | undefined;
        let orden: string | undefined;
        const digitsRest = digits.slice(best.length);
        if (digitsRest.length >= 12) {
            lote = digitsRest.slice(0, 6);
            orden = digitsRest.slice(6, 12);
        }

        return {
            raw: cleaned,
            codigoItem: best,
            lote,
            orden,
            cantidad: qty ? qty.replace(",", ".") : undefined,
        };
    }

    const restDigits = digits.slice(best.length);
    let lote: string | undefined;
    let orden: string | undefined;
    let cantidad: string | undefined;

    if (restDigits.length >= 12) {
        lote = restDigits.slice(0, 6);
        orden = restDigits.slice(6, 12);
        cantidad = restDigits.slice(12) || undefined;
    } else {
        cantidad = restDigits || undefined;
    }

    return { raw: cleaned, codigoItem: best, lote, orden, cantidad };
};
