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

    bloques: number[];
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

export type BackendConsolidadoItem = {
    id: { bloques: number[] };
    codigoItem: unknown;
    prod: unknown;
    udm: unknown;
    etiqueta: unknown;
    lote: unknown;
    ubicacion: unknown;
    bodega: unknown;
    cmpy: unknown;
    costo: unknown;
    cantidadSistema: unknown;
    cantidadConteo1: unknown;
    cantidadConteo2: unknown;
    cantidadConteo3: unknown;
    cantidadFinal: unknown;
    descripcion?: unknown;
    grupo?: unknown;
};

export type BackendConsolidadoResponse = {
    items: BackendConsolidadoItem[];
};

type BackendInput = BackendConsolidadoItem[] | BackendConsolidadoResponse;

const norm = (v: unknown) => String(v ?? "").trim();

const toNumOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const GROUP_SEP = " | ";

const mergeGroup = (current: string, next: string) => {
    const c = norm(current);
    const n = norm(next);
    if (!c) return n;
    if (!n) return c;
    if (c === n) return c;

    const set = new Set(c.split(GROUP_SEP).map((x) => x.trim()).filter(Boolean));
    set.add(n);
    return Array.from(set).join(GROUP_SEP);
};

const calcularCapturaFinal = (conteo1: number | null, conteo2: number | null, conteo3: number | null): number | null => {
    if (conteo3 !== null && conteo3 !== undefined) return conteo3;
    if (conteo1 !== null && conteo2 !== null && conteo1 === conteo2) return conteo2;
    return null;
};

const unwrapItems = (input: BackendInput): BackendConsolidadoItem[] => {
    if (Array.isArray(input)) return input;
    const items = (input as any)?.items;
    return Array.isArray(items) ? items : [];
};

export const buildConsolidado = (input: BackendInput): ConsolidadoRow[] => {
    const rows = unwrapItems(input);
    const out: ConsolidadoRow[] = [];

    for (const it of rows) {
        const codigoItem = norm(it.codigoItem);
        const ubicacion = norm(it.ubicacion);
        const lote = norm(it.lote);

        if (!codigoItem || !ubicacion) continue;

        const loteKey = lote ? lote : "__SIN_LOTE__";
        const key = `${ubicacion}||${codigoItem}||${loteKey}`;

        const conteo1 = toNumOrNull(it.cantidadConteo1);
        const conteo2 = toNumOrNull(it.cantidadConteo2);
        const conteo3 = toNumOrNull(it.cantidadConteo3);

        const costoUnitario = toNumOrNull(it.costo);
        const congelada = toNumOrNull(it.cantidadSistema);

        const etiqueta = norm(it.etiqueta);
        const udm = norm(it.udm);
        const descripcion = norm(it.descripcion);

        const bloques = Array.isArray((it as any)?.id?.bloques) ? (it as any).id.bloques : [];

        let ok12: boolean | null = null;
        let reconteoTexto: ConsolidadoRow["reconteoTexto"] = "";

        if (conteo1 !== null && conteo2 !== null) {
            if (conteo1 === conteo2) {
                ok12 = true;
                reconteoTexto = "OK !";
            } else {
                ok12 = false;
                reconteoTexto = "Recontar";
            }
        } else {
            ok12 = null;
            reconteoTexto = "";
        }

        const cantidadFinalBackend = toNumOrNull(it.cantidadFinal);
        const capturaFinal =
            cantidadFinalBackend !== null ? cantidadFinalBackend : calcularCapturaFinal(conteo1, conteo2, conteo3);

        let grupoC1 = "";
        let grupoC2 = "";
        let grupoC3 = "";

        const grupoBackend = norm((it as any)?.grupo);
        if (grupoBackend) {
            if (conteo1 !== null) grupoC1 = mergeGroup(grupoC1, grupoBackend);
            if (conteo2 !== null) grupoC2 = mergeGroup(grupoC2, grupoBackend);
            if (conteo3 !== null) grupoC3 = mergeGroup(grupoC3, grupoBackend);
        } else {
            if (conteo1 !== null) grupoC1 = "C1";
            if (conteo2 !== null) grupoC2 = "C2";
            if (conteo3 !== null) grupoC3 = "C3";
        }

        out.push({
            key,

            etiqueta,
            codigoItem,
            descripcion: descripcion || "",
            udm,
            ubicacion,
            lote,
            costoUnitario,

            congelada,

            grupoC1,
            grupoC2,
            grupoC3,

            conteo1,
            conteo2,
            conteo3,

            ok12,
            reconteoTexto,

            capturaFinal,

            bloques,
        });
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
