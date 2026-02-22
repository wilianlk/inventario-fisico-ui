export type ApiLoadingListener = () => void;

let inFlight = 0;
const listeners = new Set<ApiLoadingListener>();

const emit = () => {
    for (const l of Array.from(listeners)) l();
};

export const apiLoading = {
    getInFlight: () => inFlight,
    subscribe: (listener: ApiLoadingListener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    increment: () => {
        inFlight += 1;
        emit();
    },
    decrement: () => {
        inFlight = Math.max(0, inFlight - 1);
        emit();
    },
    reset: () => {
        inFlight = 0;
        emit();
    },
};

