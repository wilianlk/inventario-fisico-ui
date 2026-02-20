import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ItemPhystag } from "@/services/grupoUbicacionService";
import type { DupMode } from "./useGrupoUbicaciones";

interface Props {
    items: ItemPhystag[];
    loading: boolean;
    mostrarLado: boolean;
    dupMode: DupMode;
    dupCount: Map<string, number>;
    onQuitar: (item: ItemPhystag) => void;
    disabled: boolean;
    normalize: (value: any) => string;
}

export function GrupoUbicacionesTable({
    items,
    loading,
    mostrarLado,
    dupMode,
    dupCount,
    onQuitar,
    disabled,
    normalize,
}: Props) {
    return (
        <div className="flex-1 overflow-auto border rounded">
            {loading ? (
                <div className="p-4 text-sm">Cargando...</div>
            ) : items.length === 0 ? (
                <div className="p-6 text-center text-sm">Sin resultados</div>
            ) : (
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
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {items.map((it: any) => {
                            const b = normalize(it?.bodega);
                            const ubic = normalize(it?.ubicacion);
                            const item = normalize(it?.item);
                            const lote = normalize(it?.lote);

                            const dupKey =
                                dupMode === ""
                                    ? ""
                                    : dupMode === "UI"
                                        ? `${ubic}::${item}`
                                        : `${ubic}::${item}::${lote}`;

                            const veces = dupKey ? dupCount.get(dupKey) ?? 0 : 0;

                            return (
                                <TableRow key={`${b}-${ubic}-${item}-${lote}-${it?.etiqueta ?? ""}`}>
                                    <TableCell>{b}</TableCell>
                                    <TableCell>{(it?.etiqueta ?? "").toString().trim()}</TableCell>

                                    <TableCell className="font-mono">
                                        {item}
                                        {dupMode !== "" && veces > 1 ? (
                                            <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-900">
                                                repetido x{veces}
                                            </span>
                                        ) : null}
                                    </TableCell>

                                    <TableCell>{(it?.prod ?? "").toString().trim()}</TableCell>
                                    <TableCell className="font-mono">{ubic}</TableCell>
                                    <TableCell>{(it?.rackPasillo ?? "").toString().trim()}</TableCell>
                                    {mostrarLado && <TableCell>{(it?.lado ?? "").toString().trim()}</TableCell>}
                                    <TableCell>{(it?.altura ?? "").toString().trim()}</TableCell>
                                    <TableCell>{(it?.posicion ?? "").toString().trim()}</TableCell>
                                    <TableCell>{(it?.lote ?? "").toString().trim()}</TableCell>
                                    <TableCell>{(it?.descripcion ?? "").toString().trim()}</TableCell>
                                    <TableCell>{(it?.udm ?? "").toString().trim()}</TableCell>

                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-red-600"
                                            onClick={() => onQuitar(it)}
                                            disabled={disabled}
                                        >
                                            Quitar ubicacion del grupo
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
