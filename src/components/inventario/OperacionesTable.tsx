import { Operacion } from "@/services/inventarioService";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface OperacionesTableProps {
    operaciones: Operacion[];
    loading: boolean;
    onCerrar: (id: number) => void;
    onEliminar: (id: number) => void;
    formatearFecha: (valor: string) => string;
    onVerGrupos: (op: Operacion) => void;
}

const OperacionesTable = ({
                              operaciones,
                              loading,
                              onCerrar,
                              onEliminar,
                              formatearFecha,
                              onVerGrupos,
                          }: OperacionesTableProps) => {
    const gruposPorConteo: Record<number, Operacion[]> = {};

    if (Array.isArray(operaciones)) {
        for (const op of operaciones) {
            const conteo = op.numeroConteo ?? 1;
            if (!gruposPorConteo[conteo]) {
                gruposPorConteo[conteo] = [];
            }
            gruposPorConteo[conteo].push(op);
        }
    }

    const conteosOrdenados = Object.keys(gruposPorConteo)
        .map((n) => Number(n))
        .sort((a, b) => a - b);

    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Operaciones registradas</CardTitle>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <p className="text-sm text-slate-500 text-center">
                        Cargando operaciones…
                    </p>
                ) : operaciones.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center">
                        No hay operaciones registradas.
                    </p>
                ) : (
                    <div className="space-y-8">
                        {conteosOrdenados.map((conteo) => {
                            const lista = gruposPorConteo[conteo] || [];

                            return (
                                <section key={conteo} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-semibold text-slate-800">
                                            Conteo {conteo}
                                        </h2>
                                        <span className="text-xs text-slate-500">
                                            {lista.length} operación
                                            {lista.length !== 1 ? "es" : ""}
                                        </span>
                                    </div>

                                    <div className="rounded-md border border-slate-200 overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-50">
                                                <TableRow>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        ID
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Bodega
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Tipo
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Fecha
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Estado
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Usuario
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Avance
                                                    </TableHead>
                                                    <TableHead className="text-center text-xs font-medium text-slate-600">
                                                        Acciones
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>

                                            <TableBody>
                                                {lista.map((op) => {
                                                    const avanceRaw =
                                                        op.porcentajeAvance ?? 0;
                                                    const avance = Math.max(
                                                        0,
                                                        Math.min(
                                                            100,
                                                            Number.isFinite(
                                                                avanceRaw
                                                            )
                                                                ? avanceRaw
                                                                : 0
                                                        )
                                                    );

                                                    return (
                                                        <TableRow
                                                            key={op.id}
                                                            className="hover:bg-slate-50"
                                                        >
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {op.id}
                                                            </TableCell>
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {op.bodega}
                                                            </TableCell>
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {op.tipo}
                                                            </TableCell>
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {formatearFecha(
                                                                    op.fecha
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {op.estado}
                                                            </TableCell>
                                                            <TableCell className="text-center text-sm text-slate-700">
                                                                {
                                                                    op.usuarioCreacion
                                                                }
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="h-2 w-28 rounded-full bg-slate-200 overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-emerald-500"
                                                                            style={{
                                                                                width: `${avance}%`,
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-[11px] text-slate-600">
                                                                        {avance}%
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">
                                                                <div className="flex gap-2 justify-center">
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-3 text-xs"
                                                                        onClick={() =>
                                                                            onVerGrupos(
                                                                                op
                                                                            )
                                                                        }
                                                                    >
                                                                        Grupos
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-3 text-xs"
                                                                        onClick={() =>
                                                                            onCerrar(
                                                                                op.id
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            op.estado ===
                                                                            "CERRADA"
                                                                        }
                                                                    >
                                                                        Cerrar
                                                                    </Button>
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="h-8 px-3 text-xs"
                                                                        onClick={() =>
                                                                            onEliminar(
                                                                                op.id
                                                                            )
                                                                        }
                                                                    >
                                                                        Eliminar
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default OperacionesTable;
