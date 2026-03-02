"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton(): JSX.Element {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout(): Promise<void> {
    setIsLoading(true);
    try {
      await fetch("/api/logout", {
        method: "POST"
      });
      router.replace("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <button onClick={handleLogout} className="logout-button" disabled={isLoading}>
      {isLoading ? "Saindo..." : "Sair"}
    </button>
  );
}

