import { DetalleConteo, ItemConteo } from "@/services/conteoService";

export type ConteoSlot = 1 | 2 | 3;

export type ConsolidadoRow = {
    key: string;

    etiqueta: string;
    codigoItem: string;
    descripcion: string;
    udm: string;
    ubicacion: string;
    lote: string;
    costoUnitario: number | null;

    congelada: number | null;

    grupoC1: string;
    grupoC2: string;
    grupoC3: string;

    conteo1: number | null;
    conteo2: number | null;
    conteo3: number | null;

    ok12: boolean | null;
    reconteoTexto: "OK !" | "Recontar" | "";

    capturaFinal: number | null;
};

export type ConsolidacionFilters = {
    grupo: string;
    etiqueta: string;
    codigoItem: string;
    descripcion: string;
    udm: string;
    ubicacion: string;
    lote: string;
    soloOk: boolean;
    soloRecontar: boolean;
};

const norm = (v: unknown) => String(v ?? "").trim();

const toNumOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const getEtiqueta = (it: unknown) => norm((it as any)?.etiqueta);
const getLote = (it: unknown) => norm((it as any)?.lote);

const getCosto = (it: unknown) => {
    const n = Number((it as any)?.costo);
    return Number.isFinite(n) ? n : null;
};

const getCongelada = (it: unknown) => toNumOrNull((it as any)?.cantidadSistema);

const mergeIfEmpty = (current: string, next: string) => (current ? current : next);

const GROUP_SEP = " | ";

const mergeGroup = (current: string, next: string) => {
    const c = norm(current);
    const n = norm(next);
    if (!c) return n;
    if (!n) return c;
    if (c === n) return c;

    const set = new Set(c.split(GROUP_SEP).map((x: string) => x.trim()).filter(Boolean));
    set.add(n);

    return Array.from(set).join(GROUP_SEP);
};

export const buildConsolidado = (detalles: DetalleConteo[]): ConsolidadoRow[] => {
    const map = new Map<string, ConsolidadoRow>();

    for (const det of detalles) {
        const nConteo = det.numeroConteo as ConteoSlot;
        const grupoNombre = norm((det as any).grupo);

        for (const it of det.items as ItemConteo[]) {
            const codigo = norm((it as any).codigoItem);
            const ubic = norm((it as any).ubicacion);
            const lote = getLote(it);
            if (!codigo || !ubic) continue;

            const loteKey = lote ? lote : "__SIN_LOTE__";
            const key = `${ubic}||${codigo}||${loteKey}`;

            const etiqueta = getEtiqueta(it);
            const costo = getCosto(it);
            const congelada = getCongelada(it);

            const qty = toNumOrNull((it as any).cantidadContada);
            const desc = norm((it as any).descripcion);
            const udm = norm((it as any).udm);

            let row = map.get(key);
            if (!row) {
                row = {
                    key,
                    etiqueta,
                    codigoItem: codigo,
                    descripcion: desc,
                    udm,
                    ubicacion: ubic,
                    lote,
                    costoUnitario: costo,

                    congelada,

                    grupoC1: "",
                    grupoC2: "",
                    grupoC3: "",

                    conteo1: null,
                    conteo2: null,
                    conteo3: null,

                    ok12: null,
                    reconteoTexto: "",

                    capturaFinal: null,
                };
                map.set(key, row);
            } else {
                row.etiqueta = mergeIfEmpty(row.etiqueta, etiqueta);
                row.descripcion = mergeIfEmpty(row.descripcion, desc);
                row.udm = mergeIfEmpty(row.udm, udm);
                if (row.costoUnitario === null && costo !== null) row.costoUnitario = costo;
                if (row.congelada === null && congelada !== null) row.congelada = congelada;
            }

            if (nConteo === 1) {
                row.conteo1 = qty;
                row.grupoC1 = mergeGroup(row.grupoC1, grupoNombre);
            } else if (nConteo === 2) {
                row.conteo2 = qty;
                row.grupoC2 = mergeGroup(row.grupoC2, grupoNombre);
            } else if (nConteo === 3) {
                row.conteo3 = qty;
                row.grupoC3 = mergeGroup(row.grupoC3, grupoNombre);
            }
        }
    }

    const out = Array.from(map.values());

    for (const r of out) {
        if (r.conteo1 === null || r.conteo2 === null) {
            r.ok12 = null;
            r.reconteoTexto = "";
            r.capturaFinal = null;
        } else if (r.conteo1 === r.conteo2) {
            r.ok12 = true;
            r.reconteoTexto = "OK !";
            r.capturaFinal = r.conteo2;
        } else {
            r.ok12 = false;
            r.reconteoTexto = "Recontar";
            r.capturaFinal = r.conteo3 !== null ? r.conteo3 : null;
        }
    }

    out.sort(
        (a, b) =>
            a.etiqueta.localeCompare(b.etiqueta) ||
            a.codigoItem.localeCompare(b.codigoItem) ||
            a.ubicacion.localeCompare(b.ubicacion) ||
            a.lote.localeCompare(b.lote)
    );

    return out;
};

export const applyFilters = (rows: ConsolidadoRow[], f: ConsolidacionFilters) => {
    const fgr = norm(f.grupo).toLowerCase();
    const fe = norm(f.etiqueta).toLowerCase();
    const fc = norm(f.codigoItem).toLowerCase();
    const fd = norm(f.descripcion).toLowerCase();
    const fu = norm(f.udm).toLowerCase();
    const fub = norm(f.ubicacion).toLowerCase();
    const fl = norm(f.lote).toLowerCase();

    return rows.filter((r) => {
        if (f.soloOk && r.ok12 !== true) return false;
        if (f.soloRecontar && r.ok12 !== false) return false;

        if (fgr) {
            const g1 = r.grupoC1.toLowerCase().includes(fgr);
            const g2 = r.grupoC2.toLowerCase().includes(fgr);
            const g3 = r.grupoC3.toLowerCase().includes(fgr);
            if (!g1 && !g2 && !g3) return false;
        }

        if (fe && !r.etiqueta.toLowerCase().includes(fe)) return false;
        if (fc && !r.codigoItem.toLowerCase().includes(fc)) return false;
        if (fd && !r.descripcion.toLowerCase().includes(fd)) return false;
        if (fu && !r.udm.toLowerCase().includes(fu)) return false;
        if (fub && !r.ubicacion.toLowerCase().includes(fub)) return false;
        if (fl && !r.lote.toLowerCase().includes(fl)) return false;

        return true;
    });
};
