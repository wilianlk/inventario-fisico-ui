import { useState } from "react";
import { ConsolidadoRow } from "@/hooks/consolidacion.logic";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
    rows: ConsolidadoRow[];
};

const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cellNum = (v: number | null) => (v === null ? "" : v);

const parseNumberOrNull = (raw: string): number | null => {
    const s = (raw ?? "").trim();
    if (s === "") return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
};

const calcularCapturaFinal = (conteo1: number | null, conteo2: number | null, conteo3: number | null): number | null => {
    if (conteo3 !== null && conteo3 !== undefined) return conteo3;
    if (conteo1 !== null && conteo2 !== null && conteo1 === conteo2) return conteo1;
    return null;
};

const Pill = ({ text }: { text: ConsolidadoRow["reconteoTexto"] }) => {
    if (!text) return null;

    const cls = text === "OK !"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-rose-100 text-rose-700";

    return (
        <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " + cls}>
            {text}
        </span>
    );
};

type ModalProps = {
    open: boolean;
    loading?: boolean;
    row: ConsolidadoRow | null;
    onClose: () => void;
};

const ModalPlaceholder = ({ open, row, onClose }: ModalProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative w-full max-w-lg rounded-xl bg-white shadow-lg p-5">
                <h3 className="text-base font-semibold text-slate-900">Acción Grupo C3</h3>

                <div className="mt-2 text-sm text-slate-600 space-y-1">
                    <div>
                        <b>Ítem:</b> <span className="font-mono">{row?.codigoItem}</span>
                    </div>
                    <div>
                        <b>Ubicación:</b> <span className="font-mono">{row?.ubicacion}</span>
                    </div>
                    <div>
                        <b>Lote:</b> <span className="font-mono">{row?.lote}</span>
                    </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        className="px-4 py-2 rounded-md border text-sm"
                        onClick={onClose}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

const ConsolidacionTable = ({ rows }: Props) => {
    const [conteos3Editados, setConteos3Editados] = useState<Record<string, number | null>>({});
    const [modalRow, setModalRow] = useState<ConsolidadoRow | null>(null);

    const getConteo3EnVivo = (key: string, fallback: number | null) =>
        conteos3Editados[key] !== undefined ? conteos3Editados[key] : fallback;

    const setConteo3EnVivo = (key: string, value: number | null) => {
        setConteos3Editados((prev) => ({ ...prev, [key]: value }));
    };

    const clsNeg = "text-rose-600";

    const txt = (v: any) => String(v ?? "").trim();

    return (
        <>
            <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
                <div className="px-4 sm:px-6">
                    <div className="mx-auto max-w-[1700px]">
                        <div className="rounded-xl border bg-white shadow-sm">
                            <div className="p-3 sm:p-4">
                                <div className="overflow-x-auto">
                                    <Table className="table-fixed w-[1390px] mx-auto">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[50px] whitespace-nowrap text-[11px] px-2">Etiqueta</TableHead>
                                                <TableHead className="w-[80px] whitespace-nowrap text-[11px] px-2">Codigo Item</TableHead>
                                                <TableHead className="w-[240px] whitespace-nowrap text-[11px] px-2">Descripcion</TableHead>

                                                <TableHead className="w-[40px] whitespace-nowrap text-[11px] px-2">UdM</TableHead>
                                                <TableHead className="w-[70px] whitespace-nowrap text-[11px] px-2">Ubicacion</TableHead>
                                                <TableHead className="w-[80px] whitespace-nowrap text-[11px] px-2">Num.Lote</TableHead>

                                                <TableHead className="w-[85px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Costo Unitario
                                                </TableHead>

                                                <TableHead className="w-[70px] whitespace-normal leading-3 text-[11px] px-2">
                                                    Grupo C1
                                                </TableHead>
                                                <TableHead className="w-[55px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Conteo 1
                                                </TableHead>

                                                <TableHead className="w-[70px] whitespace-normal leading-3 text-[11px] px-2">
                                                    Grupo C2
                                                </TableHead>
                                                <TableHead className="w-[55px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Conteo 2
                                                </TableHead>

                                                <TableHead className="w-[65px] whitespace-normal leading-3 text-[11px] px-2">
                                                    Reconteos
                                                </TableHead>

                                                <TableHead className="w-[70px] whitespace-normal leading-3 text-[11px] px-2">
                                                    Grupo C3
                                                </TableHead>

                                                <TableHead className="w-[75px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Conteo 3
                                                </TableHead>

                                                <TableHead className="w-[75px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Captura Final
                                                </TableHead>
                                                <TableHead className="w-[70px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Congelada
                                                </TableHead>

                                                <TableHead className="w-[70px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Variacion Uds
                                                </TableHead>

                                                <TableHead className="w-[90px] whitespace-normal leading-3 text-[11px] px-2 text-right">
                                                    Variacion $$
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {rows.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={19} className="text-xs text-slate-500 py-6 text-center">
                                                        No hay datos para mostrar.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                rows.map((r) => {
                                                    const conteo3EnVivo = getConteo3EnVivo(r.key, r.conteo3);
                                                    const capturaFinalEnVivo = calcularCapturaFinal(r.conteo1, r.conteo2, conteo3EnVivo);

                                                    const variacionUds = (capturaFinalEnVivo ?? 0) - (r.congelada ?? 0);
                                                    const variacionDinero =
                                                        r.costoUnitario === null ? null : variacionUds * r.costoUnitario;

                                                    const clsVarUds = variacionUds < 0 ? clsNeg : "";
                                                    const clsVarMoney = variacionDinero !== null && variacionDinero < 0 ? clsNeg : "";

                                                    const puedeEditarConteo3 =
                                                        r.reconteoTexto === "Recontar" && (r.conteo3 ?? null) !== (r.conteo2 ?? null);

                                                    const mostrarCheckboxGrupoC3 = r.reconteoTexto === "Recontar";

                                                    return (
                                                        <TableRow key={r.key}>
                                                            <TableCell className="font-mono text-[11px] px-2 align-top">{txt(r.etiqueta)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 align-top">{txt(r.codigoItem)}</TableCell>

                                                            <TableCell className="text-[11px] px-2 whitespace-normal break-words leading-4 align-top">
                                                                {txt(r.descripcion)}
                                                            </TableCell>

                                                            <TableCell className="text-[11px] px-2 align-top">{txt(r.udm)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 align-top">{txt(r.ubicacion)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 align-top">{txt(r.lote)}</TableCell>

                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">
                                                                {r.costoUnitario === null ? "" : fmtMoney(r.costoUnitario)}
                                                            </TableCell>

                                                            <TableCell className="text-[11px] px-2 align-top">{txt(r.grupoC1)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.conteo1)}</TableCell>

                                                            <TableCell className="text-[11px] px-2 align-top">{txt(r.grupoC2)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.conteo2)}</TableCell>

                                                            <TableCell className="text-[11px] px-2 align-top">
                                                                <Pill text={r.reconteoTexto} />
                                                            </TableCell>

                                                            <TableCell className="text-[11px] px-2 align-top">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span>{txt(r.grupoC3)}</span>

                                                                    {mostrarCheckboxGrupoC3 && (
                                                                        <input
                                                                            type="checkbox"
                                                                            className="h-4 w-4 accent-slate-900 cursor-pointer"
                                                                            checked={false}
                                                                            onChange={() => setModalRow(r)}
                                                                            title="Abrir acción"
                                                                        />
                                                                    )}
                                                                </div>
                                                            </TableCell>

                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">
                                                                {puedeEditarConteo3 ? (
                                                                    <input
                                                                        type="number"
                                                                        className="w-full text-right text-[11px] border rounded px-2 py-0.5"
                                                                        value={conteo3EnVivo ?? ""}
                                                                        onChange={(e) => setConteo3EnVivo(r.key, parseNumberOrNull(e.target.value))}
                                                                    />
                                                                ) : (
                                                                    cellNum(conteo3EnVivo)
                                                                )}
                                                            </TableCell>

                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(capturaFinalEnVivo)}</TableCell>
                                                            <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.congelada)}</TableCell>

                                                            <TableCell className={"font-mono text-[11px] px-2 text-right align-top " + clsVarUds}>
                                                                {variacionUds}
                                                            </TableCell>

                                                            <TableCell className={"font-mono text-[11px] px-2 text-right align-top " + clsVarMoney}>
                                                                {variacionDinero === null ? "" : fmtMoney(variacionDinero)}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ModalPlaceholder
                open={modalRow !== null}
                row={modalRow}
                onClose={() => setModalRow(null)}
            />
        </>
    );
};

export default ConsolidacionTable;
