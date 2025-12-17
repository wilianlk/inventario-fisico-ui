import api from "./api";

export interface LoginRequest {
    usuario: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    usuario?: string;
    rol?: string;
    message?: string;
    mensaje?: string;
}

export const login = async (req: LoginRequest): Promise<LoginResponse> => {
    const res = await api.post<LoginResponse>("/auth/login", {
        Usuario: req.usuario.trim(),
        Password: req.password.trim(),
    });
    return res.data;
};
