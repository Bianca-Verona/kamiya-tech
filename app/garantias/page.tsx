"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Warranty = {
  id: string;
  description: string;
  service_date: string;
  warranty_until: string;
  category: "EGR" | "SOM_ACESSORIOS" | "PROGRAMACAO" | "ECU";

  clients?: {
    name: string;
  }[] | null;

  vehicles?: {
    plate: string;
    brand: string | null;
    model: string | null;
  }[] | null;
};

const categoryLabels: Record<string, string> = {
  EGR: "EGR",
  SOM_ACESSORIOS: "Som e acessórios",
  PROGRAMACAO: "Programação",
  ECU: "ECU",
};

function formatDate(date: string) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

function getDaysRemaining(date: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiration = new Date(`${date}T00:00:00`);
  expiration.setHours(0, 0, 0, 0);

  const difference =
    expiration.getTime() - today.getTime();

  return Math.ceil(
    difference / (1000 * 60 * 60 * 24)
  );
}

function getWarrantyStatus(date: string) {
  const days = getDaysRemaining(date);

  if (days < 0) {
    return {
      label: "Vencida",
      className:
        "border-red-500/20 bg-red-500/10 text-red-400",
    };
  }

  if (days <= 15) {
    return {
      label: "Vencendo em breve",
      className:
        "border-yellow-500/20 bg-yellow-500/10 text-yellow-400",
    };
  }

  return {
    label: "Ativa",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  };
}

export default function GarantiasPage() {
  const supabase = createClient();

  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("TODAS");

  async function loadWarranties() {
    setLoading(true);

    const { data, error } = await supabase
      .from("service_orders")
      .select(`
        id,
        description,
        service_date,
        warranty_until,
        category,
        clients (
          name
        ),
        vehicles (
          plate,
          brand,
          model
        )
      `)
      .order("warranty_until", {
        ascending: true,
      });

    if (error) {
      console.error(
        "Erro ao carregar garantias:",
        error
      );
    }

    setWarranties((data as Warranty[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadWarranties();
  }, []);

  const filteredWarranties = useMemo(() => {
    const term = search.toLowerCase().trim();

    return warranties.filter((warranty) => {
      const days = getDaysRemaining(
        warranty.warranty_until
      );

      let matchesFilter = true;

      if (filter === "ATIVAS") {
        matchesFilter = days >= 16;
      }

      if (filter === "VENCENDO") {
        matchesFilter = days >= 0 && days <= 15;
      }

      if (filter === "VENCIDAS") {
        matchesFilter = days < 0;
      }

      if (!matchesFilter) {
        return false;
      }

      if (!term) {
        return true;
      }

      const clientName =
        warranty.clients?.[0]?.name || "";

      const vehicle = warranty.vehicles?.[0];

      return (
        clientName.toLowerCase().includes(term) ||
        warranty.description
          .toLowerCase()
          .includes(term) ||
        vehicle?.plate
          ?.toLowerCase()
          .includes(term) ||
        vehicle?.model
          ?.toLowerCase()
          .includes(term)
      );
    });
  }, [warranties, search, filter]);

  const activeCount = warranties.filter(
    (item) =>
      getDaysRemaining(item.warranty_until) >= 16
  ).length;

  const expiringCount = warranties.filter((item) => {
    const days = getDaysRemaining(
      item.warranty_until
    );

    return days >= 0 && days <= 15;
  }).length;

  const expiredCount = warranties.filter(
    (item) =>
      getDaysRemaining(item.warranty_until) < 0
  ).length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-6 text-white lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
            Gestão Automotiva
          </p>

          <h1 className="mt-1 text-3xl font-semibold">
            Garantias
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Acompanhe as garantias dos serviços realizados.
          </p>
        </div>

        {/* RESUMO */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <button
            onClick={() => setFilter("ATIVAS")}
            className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 text-left transition hover:border-white/20"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Garantias ativas
            </p>

            <p className="mt-2 text-3xl font-semibold">
              {activeCount}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Mais de 15 dias restantes
            </p>
          </button>

          <button
            onClick={() => setFilter("VENCENDO")}
            className="rounded-2xl border border-yellow-500/10 bg-[#0d0d0d] p-5 text-left transition hover:border-yellow-500/20"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Vencendo em breve
            </p>

            <p className="mt-2 text-3xl font-semibold text-yellow-400">
              {expiringCount}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Próximos 15 dias
            </p>
          </button>

          <button
            onClick={() => setFilter("VENCIDAS")}
            className="rounded-2xl border border-red-500/10 bg-[#0d0d0d] p-5 text-left transition hover:border-red-500/20"
          >
            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Garantias vencidas
            </p>

            <p className="mt-2 text-3xl font-semibold text-red-400">
              {expiredCount}
            </p>

            <p className="mt-1 text-xs text-zinc-600">
              Fora do prazo
            </p>
          </button>

        </div>

        {/* BUSCA E FILTRO */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por cliente, placa, modelo ou serviço..."
            className="flex-1 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
          />

          <select
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value)
            }
            className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="TODAS">
              Todas
            </option>

            <option value="ATIVAS">
              Ativas
            </option>

            <option value="VENCENDO">
              Vencendo em breve
            </option>

            <option value="VENCIDAS">
              Vencidas
            </option>
          </select>

        </div>

        {/* LISTA */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

          <div className="border-b border-white/10 px-6 py-4">

            <h2 className="font-semibold">
              Controle de garantias
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredWarranties.length} garantia(s)
            </p>

          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Carregando garantias...
            </div>
          ) : filteredWarranties.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <div className="text-4xl">
                🛡️
              </div>

              <h3 className="mt-4 font-medium">
                Nenhuma garantia encontrada
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                As garantias dos serviços aparecerão aqui.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {filteredWarranties.map((warranty) => {
                const days = getDaysRemaining(
                  warranty.warranty_until
                );

                const status = getWarrantyStatus(
                  warranty.warranty_until
                );

                const client =
                  warranty.clients?.[0];

                const vehicle =
                  warranty.vehicles?.[0];

                return (
                  <div
                    key={warranty.id}
                    className="px-6 py-5 transition hover:bg-white/[0.02]"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* SERVIÇO */}
                      <div className="flex gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a] text-xl">
                          🛡️
                        </div>

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold">
                              {warranty.description}
                            </h3>

                            <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                              {categoryLabels[warranty.category]}
                            </span>

                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">

                            <span>
                              Cliente:{" "}
                              <span className="text-zinc-300">
                                {client?.name || "-"}
                              </span>
                            </span>

                            <span>
                              Veículo:{" "}
                              <span className="text-zinc-300">
                                {vehicle?.brand || ""}{" "}
                                {vehicle?.model || ""}
                              </span>
                            </span>

                            <span>
                              Placa:{" "}
                              <span className="text-zinc-300">
                                {vehicle?.plate || "-"}
                              </span>
                            </span>

                          </div>

                        </div>

                      </div>

                      {/* DATAS */}
                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Serviço
                          </p>

                          <p className="mt-1 text-sm text-zinc-300">
                            {formatDate(
                              warranty.service_date
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                            Vencimento
                          </p>

                          <p className="mt-1 text-sm text-zinc-300">
                            {formatDate(
                              warranty.warranty_until
                            )}
                          </p>
                        </div>

                        <div>

                          <span
                            className={`inline-flex rounded-lg border px-3 py-2 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>

                          <p className="mt-2 text-xs text-zinc-500">
                            {days < 0
                              ? `Vencida há ${Math.abs(days)} dia(s)`
                              : days === 0
                              ? "Vence hoje"
                              : `${days} dia(s) restantes`}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        </div>

      </div>
    </main>
  );
}