"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Period =
  | "HOJE"
  | "SEMANA"
  | "MES"
  | "MES_PASSADO"
  | "ULTIMOS_30"
  | "ANO"
  | "TODOS";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

type Vehicle = {
  id: string;
  client_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
};

type ServiceOrder = {
  id: string;
  client_id: string;
  vehicle_id: string;
  category:
    | "EGR"
    | "SOM_ACESSORIOS"
    | "PROGRAMACAO"
    | "ECU";
  description: string;
  service_date: string;
  warranty_until: string;
  amount_paid: number;
  shop_repass: number;
  map_cost: number;
  net_profit: number;
  payment_method: string | null;
  payment_status: "PENDENTE" | "PAGO" | "CANCELADO";
  payment_date: string | null;
  repass_status: "PENDENTE" | "REPASSADO";
  repass_date: string | null;
  notes: string | null;
};

type Expense = {
  id: string;
  description: string;
  category:
    | "MARKETING"
    | "OPERACIONAL"
    | "SOFTWARE"
    | "COMBUSTIVEL"
    | "MATERIAIS"
    | "TAXAS"
    | "OUTROS";
  amount: number;
  expense_date: string;
  notes: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T12:00:00`).toLocaleDateString(
    "pt-BR"
  );
}

function getToday() {
  const date = new Date();

  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodDates(period: Period) {
  const today = getToday();

  let start = new Date(today);
  let end = new Date(today);

  if (period === "HOJE") {
    start = new Date(today);
    end = new Date(today);
  }

  if (period === "SEMANA") {
    const day = today.getDay();

    const diff =
      day === 0
        ? 6
        : day - 1;

    start = new Date(today);
    start.setDate(
      today.getDate() - diff
    );

    end = new Date(today);
  }

  if (period === "MES") {
    start = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    end = new Date(today);
  }

  if (period === "MES_PASSADO") {
    start = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    end = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );
  }

  if (period === "ULTIMOS_30") {
    start = new Date(today);
    start.setDate(
      today.getDate() - 29
    );

    end = new Date(today);
  }

  if (period === "ANO") {
    start = new Date(
      today.getFullYear(),
      0,
      1
    );

    end = new Date(today);
  }

  if (period === "TODOS") {
    return {
      start: null,
      end: null,
    };
  }

  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
}

function getPeriodLabel(period: Period) {
  const labels = {
    HOJE: "Hoje",
    SEMANA: "Esta semana",
    MES: "Este mês",
    MES_PASSADO: "Mês passado",
    ULTIMOS_30: "Últimos 30 dias",
    ANO: "Este ano",
    TODOS: "Todos os períodos",
  };

  return labels[period];
}

function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    EGR: "EGR",
    SOM_ACESSORIOS: "Som e acessórios",
    PROGRAMACAO: "Programação",
    ECU: "ECU",
    MARKETING: "Marketing",
    OPERACIONAL: "Operacional",
    SOFTWARE: "Software",
    COMBUSTIVEL: "Combustível",
    MATERIAIS: "Materiais",
    TAXAS: "Taxas",
    OUTROS: "Outros",
  };

  return labels[category] || category;
}

export default function RelatoriosPage() {
  const supabase = createClient();

  const [period, setPeriod] =
    useState<Period>("MES");

  const [services, setServices] =
    useState<ServiceOrder[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [clients, setClients] =
    useState<Client[]>([]);

  const [vehicles, setVehicles] =
    useState<Vehicle[]>([]);

  const [selectedClientId, setSelectedClientId] =
    useState("");

  const [selectedVehicleId, setSelectedVehicleId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [reportType, setReportType] =
    useState<
      "FINANCEIRO" | "CLIENTE" | "VEICULO"
    >("FINANCEIRO");

  async function loadData() {
    setLoading(true);

    const [
      servicesResult,
      expensesResult,
      clientsResult,
      vehiclesResult,
    ] = await Promise.all([
      supabase
        .from("service_orders")
        .select("*")
        .order("service_date", {
          ascending: false,
        }),

      supabase
        .from("expenses")
        .select("*")
        .order("expense_date", {
          ascending: false,
        }),

      supabase
        .from("clients")
        .select(
          "id, name, phone, email"
        )
        .order("name"),

      supabase
        .from("vehicles")
        .select(
          "id, client_id, plate, brand, model, year"
        )
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (servicesResult.error) {
      console.error(
        "Erro ao carregar serviços:",
        servicesResult.error
      );
    }

    if (expensesResult.error) {
      console.error(
        "Erro ao carregar despesas:",
        expensesResult.error
      );
    }

    if (clientsResult.error) {
      console.error(
        "Erro ao carregar clientes:",
        clientsResult.error
      );
    }

    if (vehiclesResult.error) {
      console.error(
        "Erro ao carregar veículos:",
        vehiclesResult.error
      );
    }

    setServices(
      (servicesResult.data as ServiceOrder[]) ||
        []
    );

    setExpenses(
      (expensesResult.data as Expense[]) ||
        []
    );

    setClients(
      (clientsResult.data as Client[]) ||
        []
    );

    setVehicles(
      (vehiclesResult.data as Vehicle[]) ||
        []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const periodDates = useMemo(
    () => getPeriodDates(period),
    [period]
  );

  const periodServices = useMemo(() => {
    if (
      !periodDates.start ||
      !periodDates.end
    ) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.service_date >=
          periodDates.start! &&
        service.service_date <=
          periodDates.end!
      );
    });
  }, [
    services,
    periodDates,
  ]);

  const periodExpenses = useMemo(() => {
    if (
      !periodDates.start ||
      !periodDates.end
    ) {
      return expenses;
    }

    return expenses.filter((expense) => {
      return (
        expense.expense_date >=
          periodDates.start! &&
        expense.expense_date <=
          periodDates.end!
      );
    });
  }, [
    expenses,
    periodDates,
  ]);

  const financialSummary = useMemo(() => {
    const revenue =
      periodServices.reduce(
        (total, service) =>
          total +
          Number(
            service.amount_paid || 0
          ),
        0
      );

    const repass =
      periodServices.reduce(
        (total, service) =>
          total +
          Number(
            service.shop_repass || 0
          ),
        0
      );

    const mapCost =
      periodServices.reduce(
        (total, service) =>
          total +
          Number(
            service.map_cost || 0
          ),
        0
      );

    const serviceProfit =
      periodServices.reduce(
        (total, service) =>
          total +
          Number(
            service.net_profit || 0
          ),
        0
      );

    const expensesTotal =
      periodExpenses.reduce(
        (total, expense) =>
          total +
          Number(
            expense.amount || 0
          ),
        0
      );

    const marketing =
      periodExpenses
        .filter(
          (expense) =>
            expense.category ===
            "MARKETING"
        )
        .reduce(
          (total, expense) =>
            total +
            Number(
              expense.amount || 0
            ),
          0
        );

    const result =
      serviceProfit -
      expensesTotal;

    return {
      revenue,
      repass,
      mapCost,
      serviceProfit,
      expensesTotal,
      marketing,
      result,
    };
  }, [
    periodServices,
    periodExpenses,
  ]);

  const selectedClient = useMemo(() => {
    return clients.find(
      (client) =>
        client.id ===
        selectedClientId
    ) || null;
  }, [
    clients,
    selectedClientId,
  ]);

  const selectedClientVehicles =
    useMemo(() => {
      if (!selectedClientId) {
        return [];
      }

      return vehicles.filter(
        (vehicle) =>
          vehicle.client_id ===
          selectedClientId
      );
    }, [
      vehicles,
      selectedClientId,
    ]);

  const selectedClientServices =
    useMemo(() => {
      if (!selectedClientId) {
        return [];
      }

      return services.filter(
        (service) =>
          service.client_id ===
          selectedClientId
      );
    }, [
      services,
      selectedClientId,
    ]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find(
      (vehicle) =>
        vehicle.id ===
        selectedVehicleId
    ) || null;
  }, [
    vehicles,
    selectedVehicleId,
  ]);

  const selectedVehicleClient =
    useMemo(() => {
      if (!selectedVehicle) {
        return null;
      }

      return (
        clients.find(
          (client) =>
            client.id ===
            selectedVehicle.client_id
        ) || null
      );
    }, [
      clients,
      selectedVehicle,
    ]);

  const selectedVehicleServices =
    useMemo(() => {
      if (!selectedVehicleId) {
        return [];
      }

      return services.filter(
        (service) =>
          service.vehicle_id ===
          selectedVehicleId
      );
    }, [
      services,
      selectedVehicleId,
    ]);

  function handlePrint() {
    window.print();
  }

  function clearSelection() {
    setSelectedClientId("");
    setSelectedVehicleId("");
  }

  return (
    <>
      <main className="min-h-screen bg-[#0a0a0a] p-6 text-white lg:p-10 print:bg-white print:p-0 print:text-black">
        <div className="mx-auto max-w-7xl">

          {/* HEADER */}
          <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between print:mb-6">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-600 print:text-zinc-500">
                Gestão Automotiva
              </p>

              <h1 className="mt-1 text-3xl font-semibold">
                Relatórios
              </h1>

              <p className="mt-2 text-sm text-zinc-500 print:text-zinc-600">
                Gere relatórios financeiros, de clientes e veículos.
              </p>
            </div>

            <button
              onClick={handlePrint}
              className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 print:hidden"
            >
              🖨️ Gerar PDF
            </button>

          </div>

          {/* TIPO DE RELATÓRIO */}
          <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-3 print:hidden">

            <button
              onClick={() => {
                setReportType(
                  "FINANCEIRO"
                );
                clearSelection();
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                reportType ===
                "FINANCEIRO"
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-[#0d0d0d] hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-2xl">
                💰
              </div>

              <h2 className="mt-3 font-semibold">
                Financeiro
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Faturamento, despesas, repasses e resultado.
              </p>
            </button>

            <button
              onClick={() => {
                setReportType(
                  "CLIENTE"
                );
                setSelectedVehicleId("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                reportType ===
                "CLIENTE"
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-[#0d0d0d] hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-2xl">
                👤
              </div>

              <h2 className="mt-3 font-semibold">
                Cliente
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Histórico e valores de um cliente.
              </p>
            </button>

            <button
              onClick={() => {
                setReportType(
                  "VEICULO"
                );
                setSelectedClientId("");
              }}
              className={`rounded-2xl border p-5 text-left transition ${
                reportType ===
                "VEICULO"
                  ? "border-white/30 bg-white/10"
                  : "border-white/10 bg-[#0d0d0d] hover:bg-white/[0.03]"
              }`}
            >
              <div className="text-2xl">
                🚗
              </div>

              <h2 className="mt-3 font-semibold">
                Veículo
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Histórico completo de um veículo.
              </p>
            </button>

          </div>

          {/* FINANCEIRO */}
          {reportType ===
            "FINANCEIRO" && (
            <section>

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">

                <div>
                  <h2 className="text-xl font-semibold">
                    Relatório financeiro
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Período:{" "}
                    {getPeriodLabel(
                      period
                    )}
                  </p>
                </div>

                <select
                  value={period}
                  onChange={(event) =>
                    setPeriod(
                      event.target.value as Period
                    )
                  }
                  className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="HOJE">
                    Hoje
                  </option>

                  <option value="SEMANA">
                    Esta semana
                  </option>

                  <option value="MES">
                    Este mês
                  </option>

                  <option value="MES_PASSADO">
                    Mês passado
                  </option>

                  <option value="ULTIMOS_30">
                    Últimos 30 dias
                  </option>

                  <option value="ANO">
                    Este ano
                  </option>

                  <option value="TODOS">
                    Todos
                  </option>
                </select>

              </div>

              <div className="mb-6 hidden print:block">
                <p className="text-sm text-zinc-600">
                  Período:{" "}
                  {getPeriodLabel(
                    period
                  )}
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Gerado em{" "}
                  {new Date().toLocaleDateString(
                    "pt-BR"
                  )}
                </p>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-12 text-center text-sm text-zinc-500 print:border-zinc-200 print:bg-white">
                  Carregando relatório...
                </div>
              ) : (
                <>
                  {/* CARDS */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Faturamento
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {formatCurrency(
                          financialSummary.revenue
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Lucro dos serviços
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {formatCurrency(
                          financialSummary.serviceProfit
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Resultado final
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {formatCurrency(
                          financialSummary.result
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Repasses
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          financialSummary.repass
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Custos de mapas
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          financialSummary.mapCost
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Despesas
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          financialSummary.expensesTotal
                        )}
                      </p>
                    </div>

                  </div>

                  {/* DETALHAMENTO */}
                  <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 print:border-zinc-200 print:bg-white">

                      <h3 className="font-semibold">
                        Serviços
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {periodServices.length} ordem(ns) no período.
                      </p>

                      <div className="mt-5 space-y-3">

                        {periodServices.length ===
                        0 ? (
                          <p className="text-sm text-zinc-500">
                            Nenhum serviço no período.
                          </p>
                        ) : (
                          periodServices.map(
                            (service) => (
                              <div
                                key={service.id}
                                className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0 print:border-zinc-200"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {
                                      service.description
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {getCategoryLabel(
                                      service.category
                                    )}{" "}
                                    •{" "}
                                    {formatDate(
                                      service.service_date
                                    )}
                                  </p>
                                </div>

                                <p className="text-sm font-semibold">
                                  {formatCurrency(
                                    Number(
                                      service.amount_paid
                                    )
                                  )}
                                </p>
                              </div>
                            )
                          )
                        )}

                      </div>

                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 print:border-zinc-200 print:bg-white">

                      <h3 className="font-semibold">
                        Despesas
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        {periodExpenses.length} despesa(s) no período.
                      </p>

                      <div className="mt-5 space-y-3">

                        {periodExpenses.length ===
                        0 ? (
                          <p className="text-sm text-zinc-500">
                            Nenhuma despesa no período.
                          </p>
                        ) : (
                          periodExpenses.map(
                            (expense) => (
                              <div
                                key={expense.id}
                                className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0 print:border-zinc-200"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {
                                      expense.description
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {getCategoryLabel(
                                      expense.category
                                    )}{" "}
                                    •{" "}
                                    {formatDate(
                                      expense.expense_date
                                    )}
                                  </p>
                                </div>

                                <p className="text-sm font-semibold">
                                  {formatCurrency(
                                    Number(
                                      expense.amount
                                    )
                                  )}
                                </p>
                              </div>
                            )
                          )
                        )}

                      </div>

                    </div>

                  </div>

                  {/* MARKETING */}
                  <div className="mt-6 rounded-2xl border border-white/10 bg-[#0d0d0d] p-6 print:border-zinc-200 print:bg-white">

                    <h3 className="font-semibold">
                      Marketing
                    </h3>

                    <p className="mt-1 text-xs text-zinc-500">
                      Total investido em marketing no período.
                    </p>

                    <p className="mt-4 text-2xl font-semibold">
                      {formatCurrency(
                        financialSummary.marketing
                      )}
                    </p>

                  </div>
                </>
              )}

            </section>
          )}

          {/* CLIENTE */}
          {reportType ===
            "CLIENTE" && (
            <section>

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">

                <div>
                  <h2 className="text-xl font-semibold">
                    Relatório de cliente
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Selecione um cliente.
                  </p>
                </div>

                <select
                  value={selectedClientId}
                  onChange={(event) =>
                    setSelectedClientId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none sm:w-80"
                >
                  <option value="">
                    Selecione um cliente
                  </option>

                  {clients.map(
                    (client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name}
                      </option>
                    )
                  )}
                </select>

              </div>

              {!selectedClient ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0d0d] p-16 text-center print:hidden">

                  <div className="text-4xl">
                    👤
                  </div>

                  <p className="mt-4 text-sm text-zinc-500">
                    Selecione um cliente para visualizar o relatório.
                  </p>

                </div>
              ) : (
                <div>

                  <div className="mb-8">

                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Relatório do cliente
                    </p>

                    <h2 className="mt-2 text-3xl font-semibold">
                      {selectedClient.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
                      {selectedClient.phone && (
                        <span>
                          📱{" "}
                          {selectedClient.phone}
                        </span>
                      )}

                      {selectedClient.email && (
                        <span>
                          ✉{" "}
                          {selectedClient.email}
                        </span>
                      )}
                    </div>

                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Veículos
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {
                          selectedClientVehicles.length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Serviços
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {
                          selectedClientServices.length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Total movimentado
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {formatCurrency(
                          selectedClientServices.reduce(
                            (total, service) =>
                              total +
                              Number(
                                service.amount_paid ||
                                  0
                              ),
                            0
                          )
                        )}
                      </p>
                    </div>

                  </div>

                  {/* VEÍCULOS DO CLIENTE */}
                  <div className="mt-8">

                    <h3 className="font-semibold">
                      Veículos
                    </h3>

                    <div className="mt-4 space-y-3">

                      {selectedClientVehicles.length ===
                      0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhum veículo cadastrado.
                        </p>
                      ) : (
                        selectedClientVehicles.map(
                          (vehicle) => (
                            <div
                              key={vehicle.id}
                              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 print:border-zinc-200 print:bg-white"
                            >

                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                                <div>
                                  <p className="font-medium">
                                    {
                                      vehicle.brand
                                    }{" "}
                                    {
                                      vehicle.model
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    {vehicle.year ||
                                      "Ano não informado"}
                                  </p>
                                </div>

                                <span className="w-fit rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs font-semibold tracking-wider print:border-zinc-300 print:bg-white">
                                  {
                                    vehicle.plate
                                  }
                                </span>

                              </div>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </div>

                  {/* HISTÓRICO DO CLIENTE */}
                  <div className="mt-8">

                    <h3 className="font-semibold">
                      Histórico de serviços
                    </h3>

                    <div className="mt-4 space-y-3">

                      {selectedClientServices.length ===
                      0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhum serviço registrado.
                        </p>
                      ) : (
                        selectedClientServices.map(
                          (service) => (
                            <div
                              key={service.id}
                              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white"
                            >

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                <div>
                                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] print:border-zinc-300">
                                    {getCategoryLabel(
                                      service.category
                                    )}
                                  </span>

                                  <h4 className="mt-3 font-medium">
                                    {
                                      service.description
                                    }
                                  </h4>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Serviço em{" "}
                                    {formatDate(
                                      service.service_date
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Garantia até{" "}
                                    {formatDate(
                                      service.warranty_until
                                    )}
                                  </p>
                                </div>

                                <div className="sm:text-right">

                                  <p className="text-xs text-zinc-500">
                                    Valor
                                  </p>

                                  <p className="mt-1 font-semibold">
                                    {formatCurrency(
                                      Number(
                                        service.amount_paid
                                      )
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Lucro{" "}
                                    {formatCurrency(
                                      Number(
                                        service.net_profit
                                      )
                                    )}
                                  </p>

                                </div>

                              </div>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </div>

                </div>
              )}

            </section>
          )}

          {/* VEÍCULO */}
          {reportType ===
            "VEICULO" && (
            <section>

              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">

                <div>
                  <h2 className="text-xl font-semibold">
                    Relatório de veículo
                  </h2>

                  <p className="mt-1 text-xs text-zinc-500">
                    Selecione um veículo.
                  </p>
                </div>

                <select
                  value={selectedVehicleId}
                  onChange={(event) =>
                    setSelectedVehicleId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none sm:w-80"
                >
                  <option value="">
                    Selecione um veículo
                  </option>

                  {vehicles.map(
                    (vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.plate} •{" "}
                        {vehicle.brand ||
                          ""}{" "}
                        {vehicle.model ||
                          ""}
                      </option>
                    )
                  )}
                </select>

              </div>

              {!selectedVehicle ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0d0d0d] p-16 text-center print:hidden">

                  <div className="text-4xl">
                    🚗
                  </div>

                  <p className="mt-4 text-sm text-zinc-500">
                    Selecione um veículo para visualizar o relatório.
                  </p>

                </div>
              ) : (
                <div>

                  <div className="mb-8">

                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      Relatório do veículo
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">

                      <h2 className="text-3xl font-semibold">
                        {
                          selectedVehicle.brand
                        }{" "}
                        {
                          selectedVehicle.model
                        }
                      </h2>

                      <span className="rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs font-semibold tracking-widest print:border-zinc-300 print:bg-white">
                        {
                          selectedVehicle.plate
                        }
                      </span>

                    </div>

                    <p className="mt-2 text-sm text-zinc-500">
                      Proprietário:{" "}
                      {selectedVehicleClient?.name ||
                        "Não informado"}
                    </p>

                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Serviços
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {
                          selectedVehicleServices.length
                        }
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Total movimentado
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          selectedVehicleServices.reduce(
                            (total, service) =>
                              total +
                              Number(
                                service.amount_paid ||
                                  0
                              ),
                            0
                          )
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Lucro acumulado
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          selectedVehicleServices.reduce(
                            (total, service) =>
                              total +
                              Number(
                                service.net_profit ||
                                  0
                              ),
                            0
                          )
                        )}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white">
                      <p className="text-xs text-zinc-500">
                        Custos de mapas
                      </p>

                      <p className="mt-2 text-xl font-semibold">
                        {formatCurrency(
                          selectedVehicleServices.reduce(
                            (total, service) =>
                              total +
                              Number(
                                service.map_cost ||
                                  0
                              ),
                            0
                          )
                        )}
                      </p>
                    </div>

                  </div>

                  {/* DADOS DO CARRO */}
                  <div className="mt-8">

                    <h3 className="font-semibold">
                      Dados do veículo
                    </h3>

                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 print:border-zinc-200 print:bg-white">
                        <p className="text-[11px] text-zinc-500">
                          Placa
                        </p>

                        <p className="mt-1 text-sm font-semibold tracking-wider">
                          {
                            selectedVehicle.plate
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 print:border-zinc-200 print:bg-white">
                        <p className="text-[11px] text-zinc-500">
                          Ano
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            selectedVehicle.year ||
                            "-"
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 print:border-zinc-200 print:bg-white">
                        <p className="text-[11px] text-zinc-500">
                          Marca
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            selectedVehicle.brand ||
                            "-"
                          }
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-[#0d0d0d] p-4 print:border-zinc-200 print:bg-white">
                        <p className="text-[11px] text-zinc-500">
                          Modelo
                        </p>

                        <p className="mt-1 text-sm">
                          {
                            selectedVehicle.model ||
                            "-"
                          }
                        </p>
                      </div>

                    </div>

                  </div>

                  {/* HISTÓRICO */}
                  <div className="mt-8">

                    <h3 className="font-semibold">
                      Histórico de serviços
                    </h3>

                    <div className="mt-4 space-y-3">

                      {selectedVehicleServices.length ===
                      0 ? (
                        <p className="text-sm text-zinc-500">
                          Nenhum serviço registrado.
                        </p>
                      ) : (
                        selectedVehicleServices.map(
                          (service) => (
                            <div
                              key={service.id}
                              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-5 print:border-zinc-200 print:bg-white"
                            >

                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                <div>

                                  <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] print:border-zinc-300">
                                    {getCategoryLabel(
                                      service.category
                                    )}
                                  </span>

                                  <h4 className="mt-3 font-medium">
                                    {
                                      service.description
                                    }
                                  </h4>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Serviço:{" "}
                                    {formatDate(
                                      service.service_date
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Garantia até{" "}
                                    {formatDate(
                                      service.warranty_until
                                    )}
                                  </p>

                                </div>

                                <div className="sm:text-right">

                                  <p className="text-xs text-zinc-500">
                                    Valor pago
                                  </p>

                                  <p className="mt-1 font-semibold">
                                    {formatCurrency(
                                      Number(
                                        service.amount_paid
                                      )
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-500">
                                    Lucro{" "}
                                    {formatCurrency(
                                      Number(
                                        service.net_profit
                                      )
                                    )}
                                  </p>

                                </div>

                              </div>

                              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-3">

                                <div>
                                  <p className="text-[11px] text-zinc-500">
                                    Pagamento
                                  </p>

                                  <p className="mt-1 text-xs">
                                    {service.payment_status}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-zinc-500">
                                    Repasse
                                  </p>

                                  <p className="mt-1 text-xs">
                                    {formatCurrency(
                                      Number(
                                        service.shop_repass
                                      )
                                    )}{" "}
                                    •{" "}
                                    {
                                      service.repass_status
                                    }
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-zinc-500">
                                    Custo mapa
                                  </p>

                                  <p className="mt-1 text-xs">
                                    {formatCurrency(
                                      Number(
                                        service.map_cost
                                      )
                                    )}
                                  </p>
                                </div>

                              </div>

                            </div>
                          )
                        )
                      )}

                    </div>

                  </div>

                </div>
              )}

            </section>
          )}

        </div>
      </main>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          button,
          select {
            print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}