import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
    itemCodigo: string;
    itemLote: string;
    onItemCodigoChange: (value: string) => void;
    onItemLoteChange: (value: string) => void;
}

export function ItemSearchFields({
    itemCodigo,
    itemLote,
    onItemCodigoChange,
    onItemLoteChange,
}: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-slate-600">Item</Label>
                <Input
                    value={itemCodigo}
                    onChange={(e) => onItemCodigoChange(e.target.value)}
                    placeholder="Ej: 5103204"
                    className="text-sm"
                />
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-slate-600">Lote (opcional)</Label>
                <Input
                    value={itemLote}
                    onChange={(e) => onItemLoteChange(e.target.value)}
                    placeholder="Ej: 490013"
                    className="text-sm"
                />
            </div>
        </div>
    );
}
