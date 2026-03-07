import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { createMedicationsBulk, type CreateMedicationInput } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ message: "Sessão inválida." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Corpo inválido." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const itemsRaw = Array.isArray(body.items) ? body.items : [];
  if (itemsRaw.length === 0) {
    return NextResponse.json({ message: "Envie ao menos um item para importação." }, { status: 400 });
  }

  if (itemsRaw.length > 5000) {
    return NextResponse.json(
      { message: "Limite de 5000 itens por importação." },
      { status: 400 }
    );
  }

  const items: CreateMedicationInput[] = itemsRaw
    .map((rawItem) => rawItem as Record<string, unknown>)
    .map((item) => ({
      name: typeof item.name === "string" ? item.name.trim() : "",
      defaultUnit: typeof item.defaultUnit === "string" ? item.defaultUnit.trim() : "mg",
      activeIngredients:
        typeof item.activeIngredients === "string" ? item.activeIngredients.trim() : "",
      therapeuticClass:
        typeof item.therapeuticClass === "string" ? item.therapeuticClass.trim() : "",
      searchAliases: typeof item.searchAliases === "string" ? item.searchAliases.trim() : ""
    }))
    .filter((item) => item.name.length > 0);

  if (items.length === 0) {
    return NextResponse.json(
      { message: "Nenhum item válido encontrado para importar." },
      { status: 400 }
    );
  }

  try {
    const result = await createMedicationsBulk(items);
    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao importar medicamentos.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
