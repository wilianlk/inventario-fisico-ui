import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ItemPhystag } from "@/services/grupoUbicacionService";

interface Props {
    items: ItemPhystag[];
    mostrarLado: boolean;
    ubicacionesCount: number;
    normalize: (value: any) => string;
}

export function PreviewResultsTable({ items, mostrarLado, ubicacionesCount, normalize }: Props) {
    if (!items.length) return null;

    return (
        <>
            <div className="mb-2 text-xs text-slate-600">
                Total items:{" "}
                <span className="font-medium text-slate-900">{items.length}</span>
                {"  "}
                <span className="ml-3">
                    Ubicaciones a guardar:{" "}
                    <span className="font-medium text-slate-900">{ubicacionesCount}</span>
                </span>
            </div>

            <div className="border border-slate-200 rounded-md max-h-64 overflow-auto mb-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Bodega</TableHead>
                            <TableHead>Etiqueta</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Prod</TableHead>
                            <TableHead>Ubicaciones</TableHead>
                            <TableHead>Rack</TableHead>
                            {mostrarLado && <TableHead>Lado</TableHead>}
                            <TableHead>Altura</TableHead>
                            <TableHead>Ubicacion</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Descripcion</TableHead>
                            <TableHead>Udm</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((it) => {
                            const b = normalize((it as any).bodega || "");
                            const etiqueta = ((it as any).etiqueta ?? "").toString().trim();
                            const item = ((it as any).item ?? "").toString().trim();
                            const prod = ((it as any).prod ?? "").toString().trim();
                            const ubicaciones = normalize((it as any).ubicacion || "");
                            const rack = ((it as any).rackPasillo ?? "").toString().trim();
                            const lado = ((it as any).lado ?? "").toString().trim();
                            const altura = ((it as any).altura ?? "").toString().trim();
                            const ubicacion = ((it as any).posicion ?? "").toString().trim();
                            const lote = ((it as any).lote ?? "").toString().trim();
                            const descripcion = ((it as any).descripcion ?? "").toString().trim();
                            const udm = ((it as any).udm ?? "").toString().trim();

                            const key = `${b}-${ubicaciones}-${item}-${lote}-${etiqueta}`;

                            return (
                                <TableRow key={key}>
                                    <TableCell className="text-xs">{b}</TableCell>
                                    <TableCell className="text-xs">{etiqueta}</TableCell>
                                    <TableCell className="font-mono text-xs">{item}</TableCell>
                                    <TableCell className="text-xs">{prod}</TableCell>
                                    <TableCell className="font-mono text-xs">{ubicaciones}</TableCell>
                                    <TableCell className="text-xs">{rack}</TableCell>
                                    {mostrarLado && <TableCell className="text-xs">{lado}</TableCell>}
                                    <TableCell className="text-xs">{altura}</TableCell>
                                    <TableCell className="text-xs">{ubicacion}</TableCell>
                                    <TableCell className="text-xs">{lote}</TableCell>
                                    <TableCell className="text-xs">{descripcion}</TableCell>
                                    <TableCell className="text-xs">{udm}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
