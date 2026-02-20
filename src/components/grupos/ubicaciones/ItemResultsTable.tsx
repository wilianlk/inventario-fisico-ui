import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { ItemBusquedaPorItem } from "@/services/grupoUbicacionService";

interface Props {
    items: ItemBusquedaPorItem[];
    totalItems: number;
    mostrarLado: boolean;
    selectedCount: number;
    selectedVisibleCount: number;
    hasActiveFilters: boolean;
    allSelected: boolean;
    onToggleAll: (checked: boolean) => void;
    onToggleOne: (item: ItemBusquedaPorItem, checked: boolean) => void;
    getKey: (item: ItemBusquedaPorItem) => string;
    isSelected: (item: ItemBusquedaPorItem) => boolean;
    normalize: (value: any) => string;
}

export function ItemResultsTable({
    items,
    totalItems,
    mostrarLado,
    selectedCount,
    selectedVisibleCount,
    hasActiveFilters,
    allSelected,
    onToggleAll,
    onToggleOne,
    getKey,
    isSelected,
    normalize,
}: Props) {
    if (!items.length) return null;

    return (
        <>
            <div className="mb-2 text-xs text-slate-600">
                Total items:{" "}
                <span className="font-medium text-slate-900">{totalItems}</span>
                {hasActiveFilters && (
                    <span className="ml-3">
                        Mostrando:{" "}
                        <span className="font-medium text-slate-900">{items.length}</span>
                    </span>
                )}
                {"  "}
                <span className="ml-3">
                    Seleccionados:{" "}
                    <span className="font-medium text-slate-900">{selectedCount}</span>
                </span>
                {hasActiveFilters && (
                    <span className="ml-3">
                        Seleccionados visibles:{" "}
                        <span className="font-medium text-slate-900">{selectedVisibleCount}</span>
                    </span>
                )}
            </div>

            <div className="border border-slate-200 rounded-md max-h-64 overflow-auto mb-4">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => onToggleAll(e.target.checked)}
                                />
                            </TableHead>
                            <TableHead>Bodega</TableHead>
                            <TableHead>Item</TableHead>
                            <TableHead>Ubicacion</TableHead>
                            <TableHead>Rack</TableHead>
                            {mostrarLado && <TableHead>Lado</TableHead>}
                            <TableHead>Altura</TableHead>
                            <TableHead>Posicion</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Descripcion</TableHead>
                            <TableHead>Udm</TableHead>
                            <TableHead>Costo</TableHead>
                            <TableHead>Cant. sistema</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((it) => {
                            const key = getKey(it);
                            return (
                                <TableRow key={key}>
                                    <TableCell className="text-xs">
                                        <input
                                            type="checkbox"
                                            checked={isSelected(it)}
                                            onChange={(e) => onToggleOne(it, e.target.checked)}
                                        />
                                    </TableCell>
                                    <TableCell className="text-xs">{normalize(it.bodega)}</TableCell>
                                    <TableCell className="font-mono text-xs">{normalize(it.item)}</TableCell>
                                    <TableCell className="font-mono text-xs">{normalize(it.ubicacion)}</TableCell>
                                    <TableCell className="text-xs">{(it.rackPasillo ?? "").toString().trim()}</TableCell>
                                    {mostrarLado && <TableCell className="text-xs">{(it.lado ?? "").toString().trim()}</TableCell>}
                                    <TableCell className="text-xs">{(it.altura ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.posicion ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.lote ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.descripcion ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.udm ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.costo ?? "").toString().trim()}</TableCell>
                                    <TableCell className="text-xs">{(it.cantidadSistema ?? "").toString().trim()}</TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
