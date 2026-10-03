"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

type Vehicle = {
  id: string;
  client_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  fuel: string | null;
  chassis: string | null;
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
  notes: string | null;
  payment_method: string | null;
  payment_status: "PENDENTE" | "PAGO" | "CANCELADO";
  payment_date: string | null;
  repass_status: "PENDENTE" | "REPASSADO";
  repass_date: string | null;
  vehicle?: {
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
  } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
}

function getCategoryLabel(category: ServiceOrder["category"]) {
  const labels = {
    EGR: "EGR",
    SOM_ACESSORIOS: "Som e acessórios",
    PROGRAMACAO: "Programação",
    ECU: "ECU",
  };

  return labels[category];
}

function getPaymentStatusLabel(status: ServiceOrder["payment_status"]) {
  const labels = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    CANCELADO: "Cancelado",
  };

  return labels[status];
}

function getRepassStatusLabel(status: ServiceOrder["repass_status"]) {
  const labels = {
    PENDENTE: "Pendente",
    REPASSADO: "Repassado",
  };

  return labels[status];
}

function isWarrantyActive(warrantyUntil: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const warrantyDate = new Date(`${warrantyUntil}T12:00:00`);

  return warrantyDate >= today;
}

export default function ClientsPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [clientVehicles, setClientVehicles] =
    useState<Vehicle[]>([]);

  const [clientServices, setClientServices] =
    useState<ServiceOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  async function loadClients() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Não foi possível carregar os clientes.");
      setLoading(false);
      return;
    }

    setClients(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadClients();
  }, []);

  async function handleCreateClient(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    setSaving(true);
    setError("");

    const { error } = await supabase.from("clients").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
    });

    if (error) {
      console.error(error);
      setError("Não foi possível cadastrar o cliente.");
      setSaving(false);
      return;
    }

    setName("");
    setPhone("");
    setEmail("");

    setShowForm(false);
    setSaving(false);

    await loadClients();
  }

  async function openClientHistory(client: Client) {
    setSelectedClient(client);
    setClientVehicles([]);
    setClientServices([]);
    setLoadingHistory(true);
    setHistoryError("");

    const [vehiclesResult, servicesResult] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select(
            "id, client_id, plate, brand, model, year, color, fuel, chassis"
          )
          .eq("client_id", client.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("service_orders")
          .select(`
            id,
            client_id,
            vehicle_id,
            category,
            description,
            service_date,
            warranty_until,
            amount_paid,
            shop_repass,
            map_cost,
            net_profit,
            notes,
            payment_method,
            payment_status,
            payment_date,
            repass_status,
            repass_date,
            vehicles (
              plate,
              brand,
              model,
              year
            )
          `)
          .eq("client_id", client.id)
          .order("service_date", { ascending: false }),
      ]);

    if (vehiclesResult.error) {
      console.error(vehiclesResult.error);
      setHistoryError(
        "Não foi possível carregar os veículos deste cliente."
      );
      setLoadingHistory(false);
      return;
    }

    if (servicesResult.error) {
      console.error(servicesResult.error);
      setHistoryError(
        "Não foi possível carregar o histórico de serviços."
      );
      setLoadingHistory(false);
      return;
    }

    const services = (servicesResult.data ?? []).map(
      (service: any) => ({
        ...service,
        vehicle: Array.isArray(service.vehicles)
          ? service.vehicles[0] ?? null
          : service.vehicles ?? null,
      })
    );

    setClientVehicles(vehiclesResult.data ?? []);
    setClientServices(services);
    setLoadingHistory(false);
  }

  function closeClientHistory() {
    setSelectedClient(null);
    setClientVehicles([]);
    setClientServices([]);
    setHistoryError("");
  }

  const filteredClients = clients.filter((client) => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) return true;

    return (
      client.name.toLowerCase().includes(searchText) ||
      client.phone?.toLowerCase().includes(searchText) ||
      client.email?.toLowerCase().includes(searchText)
    );
  });

  const historySummary = useMemo(() => {
    const totalServices = clientServices.length;

    const totalAmount = clientServices.reduce(
      (total, service) =>
        total + Number(service.amount_paid || 0),
      0
    );

    const totalRepass = clientServices.reduce(
      (total, service) =>
        total + Number(service.shop_repass || 0),
      0
    );

    const totalMapCost = clientServices.reduce(
      (total, service) =>
        total + Number(service.map_cost || 0),
      0
    );

    const totalProfit = clientServices.reduce(
      (total, service) =>
        total + Number(service.net_profit || 0),
      0
    );

    const activeWarranties = clientServices.filter(
      (service) =>
        isWarrantyActive(service.warranty_until)
    ).length;

    const pendingPayments = clientServices.filter(
      (service) =>
        service.payment_status === "PENDENTE"
    ).length;

    const pendingRepasses = clientServices.filter(
      (service) =>
        service.repass_status === "PENDENTE"
    ).length;

    return {
      totalServices,
      totalAmount,
      totalRepass,
      totalMapCost,
      totalProfit,
      activeWarranties,
      pendingPayments,
      pendingRepasses,
    };
  }, [clientServices]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-7xl p-6 lg:p-10">

        {/* CABEÇALHO */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Gestão Automotiva
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Clientes
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Gerencie os clientes e consulte todo o histórico da oficina.
            </p>
          </div>

          <button
            onClick={() => {
              setShowForm(true);
              setError("");
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            + Novo cliente
          </button>
        </div>

        {/* BUSCA */}
        <div className="mb-6">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600">
              🔎
            </span>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Buscar por nome, telefone ou e-mail..."
              className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-white/30"
            />
          </div>
        </div>

        {/* ERRO */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* LISTAGEM */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

          <div className="border-b border-white/10 px-6 py-5">
            <h2 className="font-semibold">
              Clientes cadastrados
            </h2>

            <p className="mt-1 text-xs text-zinc-600">
              {filteredClients.length} cliente
              {filteredClients.length === 1 ? "" : "s"}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-zinc-500">
              Carregando clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex min-h-56 items-center justify-center px-6">
              <div className="text-center">

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-xl">
                  👤
                </div>

                <p className="text-sm font-medium">
                  {search
                    ? "Nenhum cliente encontrado"
                    : "Nenhum cliente cadastrado"}
                </p>

                <p className="mt-2 text-xs text-zinc-600">
                  {search
                    ? "Tente buscar por outro nome ou telefone."
                    : "Cadastre o primeiro cliente da oficina."}
                </p>

              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/10">

              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex flex-col gap-3 px-6 py-5 transition hover:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h3 className="font-medium">
                      {client.name}
                    </h3>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                      {client.phone && (
                        <span>📱 {client.phone}</span>
                      )}

                      {client.email && (
                        <span>✉ {client.email}</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      openClientHistory(client)
                    }
                    className="text-left text-xs text-zinc-500 transition hover:text-white sm:text-right"
                  >
                    Ver cliente →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL NOVO CLIENTE */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                    Cadastro
                  </p>

                  <h2 className="mt-1 text-xl font-semibold">
                    Novo cliente
                  </h2>
                </div>

                <button
                  onClick={() => setShowForm(false)}
                  className="text-xl text-zinc-500 transition hover:text-white"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={handleCreateClient}
                className="space-y-5"
              >
                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    Nome *
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Nome completo"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    WhatsApp
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) =>
                      setPhone(event.target.value)
                    }
                    placeholder="(11) 99999-9999"
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-zinc-400">
                    E-mail
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="cliente@email.com"
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setShowForm(false)
                    }
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Salvando..."
                      : "Salvar cliente"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL HISTÓRICO DO CLIENTE */}
        {selectedClient && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm">

            <div className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">

              {/* HEADER DO CLIENTE */}
              <div className="border-b border-white/10 p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                      Histórico do cliente
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      {selectedClient.name}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">
                      {selectedClient.phone && (
                        <span>
                          📱 {selectedClient.phone}
                        </span>
                      )}

                      {selectedClient.email && (
                        <span>
                          ✉ {selectedClient.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={closeClientHistory}
                    className="self-end text-xl text-zinc-500 transition hover:text-white sm:self-auto"
                  >
                    ×
                  </button>

                </div>
              </div>

              {loadingHistory ? (
                <div className="flex min-h-96 items-center justify-center text-sm text-zinc-500">
                  Carregando histórico...
                </div>
              ) : historyError ? (
                <div className="p-6">
                  <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
                    {historyError}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 p-6">

                  {/* RESUMO */}
                  <section>
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Resumo
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Visão geral do relacionamento com a oficina.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                      <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                        <p className="text-xs text-zinc-500">
                          Total movimentado
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {formatCurrency(
                            historySummary.totalAmount
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                        <p className="text-xs text-zinc-500">
                          Serviços
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {historySummary.totalServices}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                        <p className="text-xs text-zinc-500">
                          Lucro gerado
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {formatCurrency(
                            historySummary.totalProfit
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                        <p className="text-xs text-zinc-500">
                          Garantias ativas
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {historySummary.activeWarranties}
                        </p>
                      </div>

                    </div>
                  </section>

                  {/* VEÍCULOS */}
                  <section>
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Veículos
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Veículos vinculados a este cliente.
                      </p>
                    </div>

                    {clientVehicles.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b0b0b] p-8 text-center">
                        <p className="text-sm text-zinc-500">
                          Nenhum veículo cadastrado para este cliente.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                        {clientVehicles.map((vehicle) => (
                          <div
                            key={vehicle.id}
                            className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"
                          >
                            <div className="flex items-start justify-between gap-4">

                              <div>
                                <p className="font-medium">
                                  {vehicle.brand || "Veículo"}{" "}
                                  {vehicle.model || ""}
                                </p>

                                <p className="mt-1 text-xs text-zinc-500">
                                  {vehicle.year
                                    ? `Ano ${vehicle.year}`
                                    : "Ano não informado"}
                                </p>
                              </div>

                              <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold tracking-wider">
                                {vehicle.plate}
                              </span>

                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">

                              {vehicle.color && (
                                <div>
                                  <span className="text-zinc-700">
                                    Cor
                                  </span>
                                  <p className="mt-1 text-zinc-400">
                                    {vehicle.color}
                                  </p>
                                </div>
                              )}

                              {vehicle.fuel && (
                                <div>
                                  <span className="text-zinc-700">
                                    Combustível
                                  </span>
                                  <p className="mt-1 text-zinc-400">
                                    {vehicle.fuel}
                                  </p>
                                </div>
                              )}

                            </div>
                          </div>
                        ))}

                      </div>
                    )}
                  </section>

                  {/* HISTÓRICO DE SERVIÇOS */}
                  <section>
                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Histórico de serviços
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Todas as ordens de serviço deste cliente.
                      </p>
                    </div>

                    {clientServices.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b0b0b] p-8 text-center">
                        <p className="text-sm text-zinc-500">
                          Nenhum serviço encontrado.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">

                        {clientServices.map((service) => {
                          const warrantyActive =
                            isWarrantyActive(
                              service.warranty_until
                            );

                          return (
                            <div
                              key={service.id}
                              className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5"
                            >

                              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                                <div className="min-w-0">

                                  <div className="flex flex-wrap items-center gap-2">

                                    <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                      {getCategoryLabel(
                                        service.category
                                      )}
                                    </span>

                                    <span
                                      className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                                        warrantyActive
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : "bg-zinc-800 text-zinc-500"
                                      }`}
                                    >
                                      {warrantyActive
                                        ? "Garantia ativa"
                                        : "Garantia encerrada"}
                                    </span>

                                  </div>

                                  <h4 className="mt-3 font-medium">
                                    {service.description}
                                  </h4>

                                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">

                                    <span>
                                      📅{" "}
                                      {formatDate(
                                        service.service_date
                                      )}
                                    </span>

                                    {service.vehicle && (
                                      <span>
                                        🚗{" "}
                                        {service.vehicle.brand || ""}{" "}
                                        {service.vehicle.model || ""}{" "}
                                        •{" "}
                                        {service.vehicle.plate}
                                      </span>
                                    )}

                                    <span>
                                      🛡️ até{" "}
                                      {formatDate(
                                        service.warranty_until
                                      )}
                                    </span>

                                  </div>

                                </div>

                                <div className="shrink-0 lg:text-right">

                                  <p className="text-xs text-zinc-500">
                                    Valor pago
                                  </p>

                                  <p className="mt-1 text-lg font-semibold">
                                    {formatCurrency(
                                      Number(
                                        service.amount_paid
                                      )
                                    )}
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-600">
                                    Lucro{" "}
                                    {formatCurrency(
                                      Number(
                                        service.net_profit
                                      )
                                    )}
                                  </p>

                                </div>

                              </div>

                              <div className="mt-5 grid grid-cols-1 gap-3 border-t border-white/10 pt-4 sm:grid-cols-2 lg:grid-cols-4">

                                <div>
                                  <p className="text-[11px] text-zinc-600">
                                    Pagamento
                                  </p>

                                  <p
                                    className={`mt-1 text-xs font-medium ${
                                      service.payment_status ===
                                      "PAGO"
                                        ? "text-emerald-400"
                                        : service.payment_status ===
                                          "CANCELADO"
                                        ? "text-red-400"
                                        : "text-amber-400"
                                    }`}
                                  >
                                    {getPaymentStatusLabel(
                                      service.payment_status
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-zinc-600">
                                    Forma
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-400">
                                    {service.payment_method ||
                                      "Não informada"}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-zinc-600">
                                    Repasse
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-400">
                                    {formatCurrency(
                                      Number(
                                        service.shop_repass
                                      )
                                    )}{" "}
                                    •{" "}
                                    {getRepassStatusLabel(
                                      service.repass_status
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[11px] text-zinc-600">
                                    Custo mapa
                                  </p>

                                  <p className="mt-1 text-xs text-zinc-400">
                                    {formatCurrency(
                                      Number(
                                        service.map_cost
                                      )
                                    )}
                                  </p>
                                </div>

                              </div>

                              {service.notes && (
                                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                                  <p className="text-[11px] text-zinc-600">
                                    Observações
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap text-xs text-zinc-400">
                                    {service.notes}
                                  </p>
                                </div>
                              )}

                            </div>
                          );
                        })}

                      </div>
                    )}
                  </section>

                  {/* FECHAMENTO FINANCEIRO */}
                  {clientServices.length > 0 && (
                    <section>
                      <div className="mb-4">
                        <h3 className="font-semibold">
                          Resumo financeiro
                        </h3>

                        <p className="mt-1 text-xs text-zinc-600">
                          Valores acumulados nas ordens de serviço.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                          <p className="text-xs text-zinc-500">
                            Total recebido
                          </p>

                          <p className="mt-2 font-semibold">
                            {formatCurrency(
                              historySummary.totalAmount
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                          <p className="text-xs text-zinc-500">
                            Total repassado
                          </p>

                          <p className="mt-2 font-semibold">
                            {formatCurrency(
                              historySummary.totalRepass
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                          <p className="text-xs text-zinc-500">
                            Custo de mapas
                          </p>

                          <p className="mt-2 font-semibold">
                            {formatCurrency(
                              historySummary.totalMapCost
                            )}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">
                          <p className="text-xs text-zinc-500">
                            Lucro acumulado
                          </p>

                          <p className="mt-2 font-semibold">
                            {formatCurrency(
                              historySummary.totalProfit
                            )}
                          </p>
                        </div>

                      </div>

                      {(historySummary.pendingPayments > 0 ||
                        historySummary.pendingRepasses > 0) && (
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                          {historySummary.pendingPayments > 0 && (
                            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                              <p className="text-xs font-medium text-amber-400">
                                Pagamentos pendentes
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {historySummary.pendingPayments}{" "}
                                ordem
                                {historySummary.pendingPayments ===
                                1
                                  ? ""
                                  : "ns"}{" "}
                                com pagamento pendente.
                              </p>
                            </div>
                          )}

                          {historySummary.pendingRepasses > 0 && (
                            <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">
                              <p className="text-xs font-medium text-orange-400">
                                Repasses pendentes
                              </p>

                              <p className="mt-1 text-xs text-zinc-500">
                                {historySummary.pendingRepasses}{" "}
                                ordem
                                {historySummary.pendingRepasses ===
                                1
                                  ? ""
                                  : "ns"}{" "}
                                aguardando repasse.
                              </p>
                            </div>
                          )}

                        </div>
                      )}
                    </section>
                  )}

                  <div className="flex justify-end border-t border-white/10 pt-6">
                    <button
                      onClick={closeClientHistory}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>

                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}