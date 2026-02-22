export type ConteoSlot = 1 | 2 | 3;

export type ConsolidadoRow = {
    key: string;
    operacionId: number | null;

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
    operacionId: string;
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
    operacionId?: unknown;
    OperacionId?: unknown;
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
    conteos?: unknown;
    descripcion?: unknown;
    grupo?: unknown;
};

export type BackendConsolidadoResponse = {
    items: BackendConsolidadoItem[];
};

type BackendInput = BackendConsolidadoItem[] | BackendConsolidadoResponse;
type BackendConteoDinamico = {
    numeroConteo?: unknown;
    cantidad?: unknown;
    grupo?: unknown;
};

const norm = (v: unknown) => String(v ?? "").trim();

const toNumOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

const toOperacionIdOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isFinite(n)) return null;
    const out = Math.trunc(n);
    return out > 0 ? out : null;
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
        const operacionId = toOperacionIdOrNull(it.operacionId ?? it.OperacionId);

        const codigoItem = norm(it.codigoItem);
        const ubicacion = norm(it.ubicacion);
        const lote = norm(it.lote);

        if (!codigoItem || !ubicacion) continue;

        const loteKey = lote ? lote : "__SIN_LOTE__";
        const operacionIdKey = operacionId === null ? "__SIN_OPERACION__" : String(operacionId);
        const key = `${operacionIdKey}||${ubicacion}||${codigoItem}||${loteKey}`;

        const conteosRaw: BackendConteoDinamico[] = Array.isArray((it as any)?.conteos)
            ? ((it as any).conteos as BackendConteoDinamico[])
            : [];
        const conteosNormalizados: Array<{ numeroConteo: number; cantidad: number | null; grupo: string }> = conteosRaw
            .map((c: BackendConteoDinamico) => {
                const numeroConteo = toOperacionIdOrNull(c?.numeroConteo);
                if (numeroConteo === null) return null;
                return {
                    numeroConteo,
                    cantidad: toNumOrNull(c?.cantidad),
                    grupo: norm(c?.grupo),
                };
            })
            .filter((c): c is { numeroConteo: number; cantidad: number | null; grupo: string } => c !== null)
            .sort((a, b) => a.numeroConteo - b.numeroConteo);

        const conteoPorNumero = new Map<number, { cantidad: number | null; grupo: string }>();
        for (const c of conteosNormalizados) {
            const prev = conteoPorNumero.get(c.numeroConteo);
            conteoPorNumero.set(c.numeroConteo, {
                cantidad: prev?.cantidad ?? c.cantidad,
                grupo: mergeGroup(prev?.grupo ?? "", c.grupo),
            });
        }

        const conteo3Entry =
            Array.from(conteoPorNumero.entries())
                .filter(([numeroConteo]) => numeroConteo >= 3)
                .sort((a, b) => b[0] - a[0])[0] ?? null;

        const conteo1 = conteoPorNumero.get(1)?.cantidad ?? toNumOrNull(it.cantidadConteo1);
        const conteo2 = conteoPorNumero.get(2)?.cantidad ?? toNumOrNull(it.cantidadConteo2);
        const conteo3 = (conteo3Entry?.[1]?.cantidad ?? null) ?? toNumOrNull(it.cantidadConteo3);

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
        const cantidadFinalPorConteos = conteo3Entry?.[1]?.cantidad ?? null;
        const capturaFinal =
            cantidadFinalBackend !== null
                ? cantidadFinalBackend
                : cantidadFinalPorConteos !== null
                  ? cantidadFinalPorConteos
                  : calcularCapturaFinal(conteo1, conteo2, conteo3);

        let grupoC1 = "";
        let grupoC2 = "";
        let grupoC3 = "";

        const grupoBackend = norm((it as any)?.grupo);
        const grupoC1Conteo = norm(conteoPorNumero.get(1)?.grupo);
        const grupoC2Conteo = norm(conteoPorNumero.get(2)?.grupo);
        const grupoC3Conteo = norm(conteo3Entry?.[1]?.grupo);

        if (conteo1 !== null) {
            if (grupoC1Conteo) grupoC1 = mergeGroup(grupoC1, grupoC1Conteo);
            else if (grupoBackend) grupoC1 = mergeGroup(grupoC1, grupoBackend);
            else grupoC1 = "C1";
        }

        if (conteo2 !== null) {
            if (grupoC2Conteo) grupoC2 = mergeGroup(grupoC2, grupoC2Conteo);
            else if (grupoBackend) grupoC2 = mergeGroup(grupoC2, grupoBackend);
            else grupoC2 = "C2";
        }

        if (conteo3 !== null) {
            if (grupoC3Conteo) grupoC3 = mergeGroup(grupoC3, grupoC3Conteo);
            else if (grupoBackend) grupoC3 = mergeGroup(grupoC3, grupoBackend);
            else grupoC3 = "C3";
        }

        out.push({
            key,
            operacionId,

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
    const fo = norm(f.operacionId).toLowerCase();
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

        if (fo) {
            const operacion = r.operacionId === null ? "" : String(r.operacionId).toLowerCase();
            if (!operacion.includes(fo)) return false;
        }

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
