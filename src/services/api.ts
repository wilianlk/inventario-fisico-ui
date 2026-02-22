import axios from "axios";
import { apiLoading } from "./apiLoading";

const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_BASE_URL}api`,
    headers: { "Content-Type": "application/json" },
    // Avoid requests stuck "pending" forever.
    timeout: 60000,
});

api.interceptors.request.use(
    (config) => {
        (config as any).__loaderIncremented = true;
        apiLoading.increment();
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => {
        if ((response.config as any)?.__loaderIncremented) apiLoading.decrement();
        return response;
    },
    (error) => {
        const cfg = (error as any)?.config;
        if (cfg?.__loaderIncremented) apiLoading.decrement();
        return Promise.reject(error);
    }
);

export default api;
