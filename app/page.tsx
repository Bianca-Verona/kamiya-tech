"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ServiceOrder = {
  id: string;
  category: "EGR" | "SOM_ACESSORIOS" | "PROGRAMACAO" | "ECU";
  description: string;
  service_date: string;
  warranty_until: string;
  amount_paid: number;
  net_profit: number;

  clients?: {
    name: string;
  }[] | null;

  vehicles?: {
    plate: string;
    brand: string | null;
    model: string | null;
  }[] | null;
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

type Period =
  | "HOJE"
  | "SEMANA"
  | "MES"
  | "MES_PASSADO"
  | "ULTIMOS_30"
  | "ANO"
  | "TODOS";

const categoryLabels: Record<string, string> = {
  EGR: "EGR",
  SOM_ACESSORIOS: "Som e acessórios",
  PROGRAMACAO: "Programação",
  ECU: "ECU",
};

const expenseCategoryLabels: Record<string, string> = {
  MARKETING: "Marketing",
  OPERACIONAL: "Operacional",
  SOFTWARE: "Software / Ferramentas",
  COMBUSTIVEL: "Combustível",
  MATERIAIS: "Materiais",
  TAXAS: "Taxas",
  OUTROS: "Outros",
};

const expenseCategoryIcons: Record<string, string> = {
  MARKETING: "📣",
  OPERACIONAL: "🏢",
  SOFTWARE: "💻",
  COMBUSTIVEL: "⛽",
  MATERIAIS: "📦",
  TAXAS: "💳",
  OUTROS: "📋",
};

const menuItems = [
  {
    href: "/",
    label: "Dashboard",
    icon: "▦",
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: "♙",
  },
  {
    href: "/veiculos",
    label: "Veículos",
    icon: "🚗",
  },
  {
    href: "/servicos",
    label: "Serviços",
    icon: "🔧",
  },
  {
    href: "/garantias",
    label: "Garantias",
    icon: "🛡️",
  },
  {
    href: "/despesas",
    label: "Despesas",
    icon: "💸",
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: "📊",
  },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(date: string) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartAndEndDate(period: Period) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const end = new Date(today);
  const start = new Date(today);

  if (period === "HOJE") {
    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }

  if (period === "SEMANA") {
    const dayOfWeek = start.getDay();

    const differenceToMonday =
      dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    start.setDate(
      start.getDate() - differenceToMonday
    );

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }

  if (period === "MES") {
    start.setDate(1);

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }

  if (period === "MES_PASSADO") {
    const previousMonthStart = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );

    const previousMonthEnd = new Date(
      today.getFullYear(),
      today.getMonth(),
      0
    );

    return {
      start: getLocalDateString(previousMonthStart),
      end: getLocalDateString(previousMonthEnd),
    };
  }

  if (period === "ULTIMOS_30") {
    start.setDate(start.getDate() - 29);

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }

  if (period === "ANO") {
    start.setMonth(0, 1);

    return {
      start: getLocalDateString(start),
      end: getLocalDateString(end),
    };
  }

  return {
    start: null,
    end: null,
  };
}

function getDaysRemaining(date: string) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const expiration = new Date(
    `${date}T00:00:00`
  );

  expiration.setHours(0, 0, 0, 0);

  return Math.ceil(
    (expiration.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}

export default function DashboardPage() {
  const supabase = createClient();

  const [services, setServices] = useState<
    ServiceOrder[]
  >([]);

  const [expenses, setExpenses] = useState<
    Expense[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [period, setPeriod] =
    useState<Period>("MES");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  async function loadDashboard() {
    setLoading(true);

    const [
      { data: servicesData, error: servicesError },
      { data: expensesData, error: expensesError },
    ] = await Promise.all([
      supabase
        .from("service_orders")
        .select(`
          id,
          category,
          description,
          service_date,
          warranty_until,
          amount_paid,
          net_profit,
          clients (
            name
          ),
          vehicles (
            plate,
            brand,
            model
          )
        `)
        .order("service_date", {
          ascending: false,
        }),

      supabase
        .from("expenses")
        .select(`
          id,
          description,
          category,
          amount,
          expense_date,
          notes
        `)
        .order("expense_date", {
          ascending: false,
        }),
    ]);

    if (servicesError) {
      console.error(
        "Erro ao carregar serviços:",
        servicesError
      );
    }

    if (expensesError) {
      console.error(
        "Erro ao carregar despesas:",
        expensesError
      );
    }

    setServices(
      (servicesData as ServiceOrder[]) || []
    );

    setExpenses(
      (expensesData as Expense[]) || []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const selectedPeriod = useMemo(() => {
    return getStartAndEndDate(period);
  }, [period]);

  const periodServices = useMemo(() => {
    if (
      !selectedPeriod.start ||
      !selectedPeriod.end
    ) {
      return services;
    }

    return services.filter((service) => {
      return (
        service.service_date >=
          selectedPeriod.start! &&
        service.service_date <=
          selectedPeriod.end!
      );
    });
  }, [services, selectedPeriod]);

  const periodExpenses = useMemo(() => {
    if (
      !selectedPeriod.start ||
      !selectedPeriod.end
    ) {
      return expenses;
    }

    return expenses.filter((expense) => {
      return (
        expense.expense_date >=
          selectedPeriod.start! &&
        expense.expense_date <=
          selectedPeriod.end!
      );
    });
  }, [expenses, selectedPeriod]);

  const totalRevenue = useMemo(() => {
    return periodServices.reduce(
      (total, service) =>
        total +
        Number(service.amount_paid || 0),
      0
    );
  }, [periodServices]);

  const totalServiceProfit = useMemo(() => {
    return periodServices.reduce(
      (total, service) =>
        total +
        Number(service.net_profit || 0),
      0
    );
  }, [periodServices]);

  const totalExpenses = useMemo(() => {
    return periodExpenses.reduce(
      (total, expense) =>
        total +
        Number(expense.amount || 0),
      0
    );
  }, [periodExpenses]);

  const totalMarketing = useMemo(() => {
    return periodExpenses
      .filter(
        (expense) =>
          expense.category === "MARKETING"
      )
      .reduce(
        (total, expense) =>
          total +
          Number(expense.amount || 0),
        0
      );
  }, [periodExpenses]);

  const finalResult =
    totalServiceProfit - totalExpenses;

  const activeWarranties = useMemo(() => {
    return services.filter(
      (service) =>
        getDaysRemaining(
          service.warranty_until
        ) >= 0
    );
  }, [services]);

  const expiringWarranties = useMemo(() => {
    return services.filter((service) => {
      const days = getDaysRemaining(
        service.warranty_until
      );

      return days >= 0 && days <= 15;
    });
  }, [services]);

  const recentServices = useMemo(() => {
    return periodServices.slice(0, 5);
  }, [periodServices]);

  const recentExpenses = useMemo(() => {
    return periodExpenses.slice(0, 5);
  }, [periodExpenses]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">

      <div className="flex min-h-screen">

        {/* =================================
            SIDEBAR DESKTOP
        ================================= */}

        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-[#0d0d0d] lg:block">

          <div className="flex h-full flex-col">

            <div className="border-b border-white/10 px-6 py-6">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-black">
                  K
                </div>

                <div>

                  <p className="font-semibold tracking-wide">
                    KAMIYA TECH
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Gestão automotiva
                  </p>

                </div>

              </div>

            </div>

            <nav className="flex-1 px-3 py-5">

              <p className="mb-3 px-3 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                Menu
              </p>

              <div className="space-y-1">

                {menuItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      item.href === "/"
                        ? "bg-white/[0.06] font-medium text-white"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className="w-5 text-center">
                      {item.icon}
                    </span>

                    {item.label}
                  </a>
                ))}

              </div>

            </nav>

            <div className="border-t border-white/10 p-4">

              <div className="rounded-xl border border-white/5 bg-black/30 p-3">

                <p className="text-xs font-medium text-zinc-300">
                  Kamiya Tech
                </p>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Sistema de gestão
                </p>

              </div>

            </div>

          </div>

        </aside>

        {/* =================================
            CONTEÚDO
        ================================= */}

        <div className="flex min-w-0 flex-1">

          <div className="flex min-w-0 flex-1 flex-col">

            {/* =================================
                HEADER
            ================================= */}

            <header className="border-b border-white/10 bg-[#0a0a0a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:py-5 lg:px-10">

              <div className="mx-auto max-w-7xl">

                {/* LINHA SUPERIOR */}

                <div className="flex items-center justify-between gap-4">

                  {/* TÍTULO */}

                  <div className="flex min-w-0 items-center gap-3">

                    <button
                      type="button"
                      onClick={() =>
                        setMobileMenuOpen(true)
                      }
                      aria-label="Abrir menu"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#111111] text-xl text-white shadow-sm transition active:scale-95 hover:bg-white/10 lg:hidden"
                    >
                      ☰
                    </button>

                    <div className="min-w-0">

                      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:text-xs">
                        Visão geral
                      </p>

                      <h1 className="mt-1 text-2xl font-semibold leading-none sm:text-2xl">
                        Dashboard
                      </h1>

                    </div>

                  </div>

                  {/* FILTRO DESKTOP */}

                  <div className="hidden items-center gap-3 lg:flex">

                    <div className="text-right">

                      <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                        Período
                      </p>

                    </div>

                    <select
                      value={period}
                      onChange={(event) =>
                        setPeriod(
                          event.target.value as Period
                        )
                      }
                      className="rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-white/30"
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

                </div>

                {/* FILTRO MOBILE */}

                <div className="mt-5 lg:hidden">

                  <label
                    htmlFor="period-mobile"
                    className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-zinc-600"
                  >
                    Período
                  </label>

                  <select
                    id="period-mobile"
                    value={period}
                    onChange={(event) =>
                      setPeriod(
                        event.target.value as Period
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3.5 text-sm text-white outline-none transition focus:border-white/30"
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

              </div>

            </header>

            {/* =================================
                DASHBOARD
            ================================= */}

            <main className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-10">

              {/* AVISO DO PERÍODO */}

              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-sm font-medium text-zinc-300">
                    Visão financeira
                  </p>

                  <p className="text-xs text-zinc-600">
                    Os valores abaixo correspondem ao período selecionado.
                  </p>

                </div>

                <span className="text-xs text-zinc-600">

                  {selectedPeriod.start &&
                  selectedPeriod.end
                    ? `${formatDate(
                        selectedPeriod.start
                      )} até ${formatDate(
                        selectedPeriod.end
                      )}`
                    : "Todo o período"}

                </span>

              </div>

              {/* =================================
                  CARDS FINANCEIROS
              ================================= */}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                {/* FATURAMENTO */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Faturamento
                      </p>

                      <p className="mt-3 text-2xl font-semibold">
                        {loading
                          ? "..."
                          : formatMoney(
                              totalRevenue
                            )}
                      </p>

                    </div>

                    <span className="text-xl">
                      💰
                    </span>

                  </div>

                  <p className="mt-3 text-xs text-zinc-600">
                    Total recebido pelos serviços
                  </p>

                </div>

                {/* LUCRO */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Lucro dos serviços
                      </p>

                      <p className="mt-3 text-2xl font-semibold text-emerald-400">
                        {loading
                          ? "..."
                          : formatMoney(
                              totalServiceProfit
                            )}
                      </p>

                    </div>

                    <span className="text-xl">
                      📈
                    </span>

                  </div>

                  <p className="mt-3 text-xs text-zinc-600">
                    Após repasses e custos de mapa
                  </p>

                </div>

                {/* DESPESAS */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Despesas
                      </p>

                      <p className="mt-3 text-2xl font-semibold text-red-400">
                        {loading
                          ? "..."
                          : formatMoney(
                              totalExpenses
                            )}
                      </p>

                    </div>

                    <span className="text-xl">
                      💸
                    </span>

                  </div>

                  <p className="mt-3 text-xs text-zinc-600">
                    Gastos da operação
                  </p>

                </div>

                {/* RESULTADO */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-start justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Resultado final
                      </p>

                      <p
                        className={`mt-3 text-2xl font-semibold ${
                          finalResult >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {loading
                          ? "..."
                          : formatMoney(
                              finalResult
                            )}
                      </p>

                    </div>

                    <span className="text-xl">
                      🧮
                    </span>

                  </div>

                  <p className="mt-3 text-xs text-zinc-600">
                    Lucro dos serviços - despesas
                  </p>

                </div>

              </div>

              {/* =================================
                  RESUMO OPERACIONAL
              ================================= */}

              <div className="mt-6 grid gap-4 sm:grid-cols-3">

                {/* SERVIÇOS */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Serviços
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {loading
                          ? "..."
                          : periodServices.length}
                      </p>

                    </div>

                    <span className="text-xl">
                      🔧
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    No período selecionado
                  </p>

                </div>

                {/* GARANTIAS */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Garantias ativas
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {loading
                          ? "..."
                          : activeWarranties.length}
                      </p>

                    </div>

                    <span className="text-xl">
                      🛡️
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    Situação atual
                  </p>

                </div>

                {/* MARKETING */}

                <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-wider text-zinc-600">
                        Marketing
                      </p>

                      <p className="mt-2 text-2xl font-semibold text-violet-400">
                        {loading
                          ? "..."
                          : formatMoney(
                              totalMarketing
                            )}
                      </p>

                    </div>

                    <span className="text-xl">
                      📣
                    </span>

                  </div>

                  <p className="mt-2 text-xs text-zinc-600">
                    Investido no período
                  </p>

                </div>

              </div>

              {/* =================================
                  SERVIÇOS + GARANTIAS
              ================================= */}

              <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">

                {/* SERVIÇOS */}

                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

                    <div>

                      <h2 className="font-semibold">
                        Serviços recentes
                      </h2>

                      <p className="mt-1 text-xs text-zinc-600">
                        Serviços do período
                      </p>

                    </div>

                    <a
                      href="/servicos"
                      className="text-xs text-zinc-500 transition hover:text-white"
                    >
                      Ver todos →
                    </a>

                  </div>

                  {loading ? (

                    <div className="px-6 py-12 text-center text-sm text-zinc-600">
                      Carregando...
                    </div>

                  ) : recentServices.length === 0 ? (

                    <div className="px-6 py-12 text-center">

                      <div className="text-3xl">
                        🔧
                      </div>

                      <p className="mt-3 text-sm text-zinc-500">
                        Nenhum serviço no período.
                      </p>

                    </div>

                  ) : (

                    <div className="divide-y divide-white/5">

                      {recentServices.map(
                        (service) => {

                          const client =
                            service.clients?.[0];

                          const vehicle =
                            service.vehicles?.[0];

                          return (

                            <div
                              key={service.id}
                              className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                            >

                              <div className="flex min-w-0 gap-4">

                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black text-sm">
                                  🔧
                                </div>

                                <div className="min-w-0">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <p className="text-sm font-medium">
                                      {
                                        service.description
                                      }
                                    </p>

                                    <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-500">
                                      {
                                        categoryLabels[
                                          service.category
                                        ]
                                      }
                                    </span>

                                  </div>

                                  <p className="mt-1 break-words text-xs text-zinc-600">

                                    {client?.name ||
                                      "-"}

                                    {" • "}

                                    {vehicle?.brand ||
                                      ""}

                                    {" "}

                                    {vehicle?.model ||
                                      ""}

                                    {" • "}

                                    {vehicle?.plate ||
                                      "-"}

                                  </p>

                                </div>

                              </div>

                              <div className="text-left sm:text-right">

                                <p className="text-sm font-semibold">
                                  {formatMoney(
                                    Number(
                                      service.amount_paid
                                    )
                                  )}
                                </p>

                                <p className="mt-1 text-xs text-zinc-600">
                                  {formatDate(
                                    service.service_date
                                  )}
                                </p>

                              </div>

                            </div>

                          );
                        }
                      )}

                    </div>

                  )}

                </section>

                {/* GARANTIAS */}

                <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

                  <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

                    <div>

                      <h2 className="font-semibold">
                        Garantias próximas
                      </h2>

                      <p className="mt-1 text-xs text-zinc-600">
                        Vencendo nos próximos 15 dias
                      </p>

                    </div>

                    <a
                      href="/garantias"
                      className="text-xs text-zinc-500 transition hover:text-white"
                    >
                      Ver todas →
                    </a>

                  </div>

                  {loading ? (

                    <div className="px-6 py-12 text-center text-sm text-zinc-600">
                      Carregando...
                    </div>

                  ) : expiringWarranties.length === 0 ? (

                    <div className="px-6 py-12 text-center">

                      <div className="text-3xl">
                        🛡️
                      </div>

                      <p className="mt-3 text-sm text-zinc-500">
                        Nenhuma garantia próxima do vencimento.
                      </p>

                    </div>

                  ) : (

                    <div className="divide-y divide-white/5">

                      {expiringWarranties
                        .slice(0, 5)
                        .map((warranty) => {

                          const days =
                            getDaysRemaining(
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

                              <div className="flex items-start justify-between gap-4">

                                <div className="min-w-0">

                                  <p className="text-sm font-medium">
                                    {client?.name ||
                                      "-"}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-600">

                                    {vehicle?.brand ||
                                      ""}

                                    {" "}

                                    {vehicle?.model ||
                                      ""}

                                    {" • "}

                                    {vehicle?.plate ||
                                      "-"}

                                  </p>

                                </div>

                                <div className="shrink-0 text-right">

                                  <span className="inline-flex rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-2 py-1 text-[10px] font-medium text-yellow-400">

                                    {days === 0
                                      ? "Vence hoje"
                                      : `${days} dias`}

                                  </span>

                                  <p className="mt-2 text-[10px] text-zinc-600">
                                    {formatDate(
                                      warranty.warranty_until
                                    )}
                                  </p>

                                </div>

                              </div>

                            </div>

                          );
                        })}

                    </div>

                  )}

                </section>

              </div>

              {/* =================================
                  DESPESAS
              ================================= */}

              <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">

                  <div>

                    <h2 className="font-semibold">
                      Despesas recentes
                    </h2>

                    <p className="mt-1 text-xs text-zinc-600">
                      Gastos do período
                    </p>

                  </div>

                  <a
                    href="/despesas"
                    className="text-xs text-zinc-500 transition hover:text-white"
                  >
                    Ver todas →
                  </a>

                </div>

                {loading ? (

                  <div className="px-6 py-12 text-center text-sm text-zinc-600">
                    Carregando...
                  </div>

                ) : recentExpenses.length === 0 ? (

                  <div className="px-6 py-12 text-center">

                    <div className="text-3xl">
                      💸
                    </div>

                    <p className="mt-3 text-sm text-zinc-500">
                      Nenhuma despesa no período.
                    </p>

                  </div>

                ) : (

                  <div className="divide-y divide-white/5">

                    {recentExpenses.map(
                      (expense) => (

                        <div
                          key={expense.id}
                          className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                        >

                          <div className="flex min-w-0 items-center gap-4">

                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black text-sm">
                              {
                                expenseCategoryIcons[
                                  expense.category
                                ]
                              }
                            </div>

                            <div className="min-w-0">

                              <div className="flex flex-wrap items-center gap-2">

                                <p className="break-words text-sm font-medium">
                                  {
                                    expense.description
                                  }
                                </p>

                                <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-[9px] uppercase tracking-wider text-zinc-500">
                                  {
                                    expenseCategoryLabels[
                                      expense.category
                                    ]
                                  }
                                </span>

                              </div>

                              <p className="mt-1 text-xs text-zinc-600">
                                {formatDate(
                                  expense.expense_date
                                )}
                              </p>

                            </div>

                          </div>

                          <p className="text-sm font-semibold text-red-400">
                            -{" "}
                            {formatMoney(
                              Number(
                                expense.amount
                              )
                            )}
                          </p>

                        </div>

                      )
                    )}

                  </div>

                )}

              </section>

            </main>

          </div>

        </div>

      </div>

      {/* =================================
          MENU MOBILE
      ================================= */}

      {mobileMenuOpen && (
        <>

          {/* FUNDO */}

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMobileMenu}
            className="fixed inset-0 z-[998] bg-black/75 backdrop-blur-sm lg:hidden"
          />

          {/* GAVETA */}

          <aside
            className="fixed left-0 top-0 z-[999] flex h-[100dvh] w-[290px] flex-col border-r border-white/10 bg-[#0d0d0d] shadow-2xl lg:hidden"
            style={{
              paddingTop:
                "max(1rem, env(safe-area-inset-top))",
            }}
          >

            {/* CABEÇALHO DO MENU */}

            <div className="flex items-center justify-between border-b border-white/10 px-5 pb-5 pt-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-black">
                  K
                </div>

                <div>

                  <p className="font-semibold tracking-wide">
                    KAMIYA TECH
                  </p>

                  <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">
                    Gestão automotiva
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeMobileMenu}
                aria-label="Fechar menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>

            </div>

            {/* ITENS */}

            <nav className="flex-1 overflow-y-auto px-3 py-5">

              <p className="mb-3 px-3 text-[10px] uppercase tracking-[0.2em] text-zinc-700">
                Menu
              </p>

              <div className="space-y-1">

                {menuItems.map((item) => (

                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition ${
                      item.href === "/"
                        ? "bg-white/[0.07] font-medium text-white"
                        : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >

                    <span className="flex w-6 items-center justify-center text-base">
                      {item.icon}
                    </span>

                    <span>
                      {item.label}
                    </span>

                  </a>

                ))}

              </div>

            </nav>

            {/* RODAPÉ */}

            <div className="border-t border-white/10 p-4">

              <div className="rounded-xl border border-white/5 bg-black/30 p-3">

                <p className="text-xs font-medium text-zinc-300">
                  Kamiya Tech
                </p>

                <p className="mt-1 text-[10px] text-zinc-600">
                  Sistema de gestão
                </p>

              </div>

            </div>

          </aside>

        </>
      )}

    </main>
  );
}