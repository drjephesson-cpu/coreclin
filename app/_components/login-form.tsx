"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage("");

    if (!username.trim() || !password) {
      setErrorMessage("Informe usuário e senha para continuar.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password
        })
      });

      if (!response.ok) {
        const result = (await response.json()) as { message?: string };
        setErrorMessage(result.message ?? "Falha ao autenticar.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setErrorMessage("Não foi possível conectar ao servidor.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label htmlFor="username">Usuário</label>
      <input
        id="username"
        name="username"
        type="text"
        autoComplete="username"
        placeholder="Digite seu usuário"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <label htmlFor="password">Senha</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <button type="submit" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar no CoreClin"}
      </button>
    </form>
  );
}
