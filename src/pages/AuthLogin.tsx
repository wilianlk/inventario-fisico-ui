import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { login } from "@/services/authService";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function AuthLogin() {
    const navigate = useNavigate();

    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const u = usuario.trim();
        const p = password.trim();

        if (!u) return toast.error("Ingresa tu correo corporativo.");
        if (!u.toLowerCase().endsWith("@recamier.com")) return toast.error("Solo se permite correo @recamier.com.");
        if (!p) return toast.error("Ingresa la contraseña.");

        try {
            setLoading(true);
            const data = await login({ usuario: u, password: p });

            if (!data?.success) {
                toast.error(data?.message || data?.mensaje || "Credenciales inválidas.");
                return;
            }

            const usuarioResp = String(data.usuario || u);
            const rolResp = String(data.rol || "");

            if (!rolResp) {
                toast.error("Login válido pero sin rol en respuesta.");
                return;
            }

            localStorage.setItem("usuario", usuarioResp);
            localStorage.setItem("rol", rolResp);

            window.dispatchEvent(new Event("auth-changed"));

            toast.success(`Bienvenido: ${usuarioResp}`);
            navigate("/", { replace: true });
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Error conectando con el servidor.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="min-h-[70vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
                    <CardDescription>Acceso interno Inventario Físico</CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="usuario">Correo</Label>
                            <Input
                                id="usuario"
                                type="email"
                                value={usuario}
                                onChange={(e) => setUsuario(e.target.value)}
                                placeholder="correo@recamier.com"
                                autoComplete="username"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="InvF1sico#Access"
                                autoComplete="current-password"
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Ingresando..." : "Ingresar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </section>
    );
}
