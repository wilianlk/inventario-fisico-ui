import { useSyncExternalStore } from "react";
import { apiLoading } from "@/services/apiLoading";

const getSnapshot = () => apiLoading.getInFlight();

export default function ApiGlobalLoader() {
    const inFlight = useSyncExternalStore(apiLoading.subscribe, getSnapshot, getSnapshot);

    if (inFlight <= 0) return null;

    return (
        <div className="fixed inset-x-0 top-0 z-[120]">
            <div className="h-1 bg-slate-200 overflow-hidden">
                <div className="api-loading-bar h-full w-1/3 bg-slate-900" />
            </div>
        </div>
    );
}

