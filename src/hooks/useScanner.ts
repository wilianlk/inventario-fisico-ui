import { useEffect, useRef } from "react";

interface UseScannerOptions {
    minLength?: number;
}

export function useScanner(
    onScan: (code: string) => void,
    options?: UseScannerOptions
) {
    const bufferRef = useRef("");
    const { minLength = 3 } = options || {};

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.tagName === "SELECT" ||
                    target.getAttribute("contenteditable") === "true")
            ) {
                return;
            }

            if (e.key === "Enter") {
                const code = bufferRef.current.trim();
                bufferRef.current = "";
                if (code.length >= minLength) {
                    onScan(code);
                }
                return;
            }

            if (e.key.length === 1) {
                bufferRef.current += e.key;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [onScan, minLength]);
}
