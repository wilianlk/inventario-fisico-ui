import { ConsolidadoRow } from "@/hooks/consolidacion.logic";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
    rows: ConsolidadoRow[];
};

const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cellNum = (v: number | null) => (v === null ? "" : v);

const Pill = ({ text }: { text: ConsolidadoRow["reconteoTexto"] }) => {
    if (!text) return null;
    const cls = text === "OK !" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";
    return (
        <span className={"inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold " + cls}>
            {text}
        </span>
    );
};

const ConsolidacionTable = ({ rows }: Props) => {
    return (
        <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
            <div className="px-4 sm:px-6">
                <div className="mx-auto max-w-[1700px]">
                    <div className="rounded-xl border bg-white shadow-sm">
                        <div className="p-3 sm:p-4">
                            <div className="overflow-x-auto">
                                {/* Ancho fijo para que no se “inflen” las columnas */}
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
                                            <TableHead className="w-[55px] whitespace-normal leading-3 text-[11px] px-2 text-right">
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
                                                // Variación Uds = Captura Final - Congelada (puede ser negativa)
                                                const variacionUds = (r.capturaFinal ?? 0) - (r.congelada ?? 0);

                                                // Variación $$ = Variación Uds * Costo Unitario (puede ser negativa)
                                                const variacionDinero =
                                                    r.costoUnitario === null ? null : variacionUds * r.costoUnitario;

                                                return (
                                                    <TableRow key={r.key}>
                                                        <TableCell className="font-mono text-[11px] px-2 align-top">{r.etiqueta}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 align-top">{r.codigoItem}</TableCell>

                                                        <TableCell className="text-[11px] px-2 whitespace-normal break-words leading-4 align-top">
                                                            {r.descripcion}
                                                        </TableCell>

                                                        <TableCell className="text-[11px] px-2 align-top">{r.udm}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 align-top">{r.ubicacion}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 align-top">{r.lote}</TableCell>

                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">
                                                            {r.costoUnitario === null ? "" : fmtMoney(r.costoUnitario)}
                                                        </TableCell>

                                                        <TableCell className="text-[11px] px-2 align-top">{r.grupoC1}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.conteo1)}</TableCell>

                                                        <TableCell className="text-[11px] px-2 align-top">{r.grupoC2}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.conteo2)}</TableCell>

                                                        <TableCell className="text-[11px] px-2 align-top">
                                                            <Pill text={r.reconteoTexto} />
                                                        </TableCell>

                                                        <TableCell className="text-[11px] px-2 align-top">{r.grupoC3}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.conteo3)}</TableCell>

                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.capturaFinal)}</TableCell>
                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">{cellNum(r.congelada)}</TableCell>

                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">
                                                            {variacionUds}
                                                        </TableCell>

                                                        <TableCell className="font-mono text-[11px] px-2 text-right align-top">
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
    );
};

export default ConsolidacionTable;
