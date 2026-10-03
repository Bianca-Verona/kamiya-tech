"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Client = {
  id: string;
  name: string;
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
  created_at: string;
  clients?: {
    name: string;
  } | null;
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

function getCategoryLabel(category: ServiceOrder["category"]) {
  const labels = {
    EGR: "EGR",
    SOM_ACESSORIOS: "Som e acessórios",
    PROGRAMACAO: "Programação",
    ECU: "ECU",
  };

  return labels[category];
}

function getPaymentStatusLabel(
  status: ServiceOrder["payment_status"]
) {
  const labels = {
    PENDENTE: "Pendente",
    PAGO: "Pago",
    CANCELADO: "Cancelado",
  };

  return labels[status];
}

function getRepassStatusLabel(
  status: ServiceOrder["repass_status"]
) {
  const labels = {
    PENDENTE: "Pendente",
    REPASSADO: "Repassado",
  };

  return labels[status];
}

function isWarrantyActive(warrantyUntil: string) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const warrantyDate = new Date(
    `${warrantyUntil}T12:00:00`
  );

  return warrantyDate >= today;
}

export default function VeiculosPage() {
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingHistory, setLoadingHistory] =
    useState(false);

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [selectedVehicle, setSelectedVehicle] =
    useState<Vehicle | null>(null);

  const [vehicleServices, setVehicleServices] =
    useState<ServiceOrder[]>([]);

  const [historyError, setHistoryError] = useState("");

  const [clientId, setClientId] = useState("");
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [fuel, setFuel] = useState("");
  const [chassis, setChassis] = useState("");

  async function loadData() {
    setLoading(true);

    const [
      {
        data: vehiclesData,
        error: vehiclesError,
      },
      {
        data: clientsData,
        error: clientsError,
      },
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select(`
          *,
          clients (
            name
          )
        `)
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("clients")
        .select("id, name")
        .order("name"),
    ]);

    if (vehiclesError) {
      console.error(
        "Erro ao carregar veículos:",
        vehiclesError
      );
    }

    if (clientsError) {
      console.error(
        "Erro ao carregar clientes:",
        clientsError
      );
    }

    setVehicles(
      (vehiclesData as Vehicle[]) || []
    );

    setClients(clientsData || []);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    setClientId("");
    setPlate("");
    setBrand("");
    setModel("");
    setYear("");
    setColor("");
    setFuel("");
    setChassis("");
  }

  async function handleSave() {
    if (!clientId) {
      alert("Selecione um cliente.");
      return;
    }

    if (!plate.trim()) {
      alert("Informe a placa.");
      return;
    }

    if (!model.trim()) {
      alert("Informe o modelo do veículo.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("vehicles")
      .insert({
        client_id: clientId,
        plate: plate.trim().toUpperCase(),
        brand: brand.trim() || null,
        model: model.trim(),
        year: year ? Number(year) : null,
        color: color.trim() || null,
        fuel: fuel || null,
        chassis: chassis.trim() || null,
      });

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Essa placa já está cadastrada.");
      } else {
        alert(
          "Não foi possível cadastrar o veículo."
        );
      }

      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    resetForm();

    await loadData();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este veículo?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      alert(
        "Não foi possível excluir este veículo. Ele pode estar vinculado a uma ordem de serviço."
      );

      return;
    }

    await loadData();
  }

  async function openVehicleHistory(
    vehicle: Vehicle
  ) {
    setSelectedVehicle(vehicle);
    setVehicleServices([]);
    setHistoryError("");
    setLoadingHistory(true);

    const { data, error } = await supabase
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
        repass_date
      `)
      .eq("vehicle_id", vehicle.id)
      .order("service_date", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      setHistoryError(
        "Não foi possível carregar o histórico deste veículo."
      );

      setLoadingHistory(false);

      return;
    }

    setVehicleServices(
      (data as ServiceOrder[]) || []
    );

    setLoadingHistory(false);
  }

  function closeVehicleHistory() {
    setSelectedVehicle(null);
    setVehicleServices([]);
    setHistoryError("");
  }

  const filteredVehicles = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return vehicles;

    return vehicles.filter((vehicle) => {
      const clientName =
        vehicle.clients?.name || "";

      return (
        vehicle.plate
          ?.toLowerCase()
          .includes(term) ||
        vehicle.brand
          ?.toLowerCase()
          .includes(term) ||
        vehicle.model
          ?.toLowerCase()
          .includes(term) ||
        clientName
          .toLowerCase()
          .includes(term)
      );
    });
  }, [vehicles, search]);

  const historySummary = useMemo(() => {
    const totalServices =
      vehicleServices.length;

    const totalAmount =
      vehicleServices.reduce(
        (total, service) =>
          total +
          Number(service.amount_paid || 0),
        0
      );

    const totalRepass =
      vehicleServices.reduce(
        (total, service) =>
          total +
          Number(service.shop_repass || 0),
        0
      );

    const totalMapCost =
      vehicleServices.reduce(
        (total, service) =>
          total +
          Number(service.map_cost || 0),
        0
      );

    const totalProfit =
      vehicleServices.reduce(
        (total, service) =>
          total +
          Number(service.net_profit || 0),
        0
      );

    const activeWarranties =
      vehicleServices.filter(
        (service) =>
          isWarrantyActive(
            service.warranty_until
          )
      ).length;

    const pendingPayments =
      vehicleServices.filter(
        (service) =>
          service.payment_status ===
          "PENDENTE"
      ).length;

    const pendingRepasses =
      vehicleServices.filter(
        (service) =>
          service.repass_status ===
          "PENDENTE"
      ).length;

    const lastService =
      vehicleServices.length > 0
        ? vehicleServices[0]
        : null;

    return {
      totalServices,
      totalAmount,
      totalRepass,
      totalMapCost,
      totalProfit,
      activeWarranties,
      pendingPayments,
      pendingRepasses,
      lastService,
    };
  }, [vehicleServices]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-6 text-white lg:p-10">
      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Gestão Automotiva
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Veículos
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Gerencie os veículos cadastrados no sistema.
            </p>
          </div>

          <button
            onClick={() => {
              setShowModal(true);
              setHistoryError("");
            }}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            + Novo veículo
          </button>
        </div>

        {/* BUSCA */}
        <div className="mb-6">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar por placa, modelo ou cliente..."
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
          />
        </div>

        {/* LISTA */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="font-semibold">
              Veículos cadastrados
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredVehicles.length} veículo(s)
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Carregando veículos...
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="text-4xl">
                🚗
              </div>

              <h3 className="mt-4 font-medium">
                Nenhum veículo encontrado
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Cadastre o primeiro veículo para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {filteredVehicles.map(
                (vehicle) => (
                  <div
                    key={vehicle.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-white/[0.02] lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a] text-xl">
                        🚗
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-3">

                          <h3 className="font-semibold">
                            {vehicle.brand ||
                              "Veículo"}{" "}
                            {vehicle.model ||
                              ""}
                          </h3>

                          <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-xs font-semibold tracking-widest text-zinc-300">
                            {vehicle.plate}
                          </span>

                        </div>

                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">

                          {vehicle.year && (
                            <span>
                              {vehicle.year}
                            </span>
                          )}

                          {vehicle.color && (
                            <span>
                              {vehicle.color}
                            </span>
                          )}

                          {vehicle.fuel && (
                            <span>
                              {vehicle.fuel}
                            </span>
                          )}

                          <span>
                            Cliente:{" "}
                            <span className="text-zinc-300">
                              {vehicle.clients
                                ?.name ||
                                "Não informado"}
                            </span>
                          </span>

                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">

                      <button
                        onClick={() =>
                          openVehicleHistory(
                            vehicle
                          )
                        }
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                      >
                        Ver histórico →
                      </button>

                      <button
                        onClick={() =>
                          handleDelete(
                            vehicle.id
                          )
                        }
                        className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
                      >
                        Excluir
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVO VEÍCULO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between">

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Cadastro
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Novo veículo
                </h2>
              </div>

              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-xl text-zinc-500 transition hover:text-white"
              >
                ×
              </button>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {/* CLIENTE */}
              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Cliente *
                </label>

                <select
                  value={clientId}
                  onChange={(event) =>
                    setClientId(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
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

                {clients.length === 0 && (
                  <p className="mt-2 text-xs text-amber-400">
                    Cadastre um cliente antes de cadastrar um veículo.
                  </p>
                )}

              </div>

              {/* PLACA */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Placa *
                </label>

                <input
                  value={plate}
                  onChange={(event) =>
                    setPlate(
                      event.target.value.toUpperCase()
                    )
                  }
                  maxLength={7}
                  placeholder="ABC1D23"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm tracking-widest text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* MARCA */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Marca
                </label>

                <input
                  value={brand}
                  onChange={(event) =>
                    setBrand(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Volkswagen"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* MODELO */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Modelo *
                </label>

                <input
                  value={model}
                  onChange={(event) =>
                    setModel(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Gol"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* ANO */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Ano
                </label>

                <input
                  value={year}
                  onChange={(event) =>
                    setYear(
                      event.target.value
                    )
                  }
                  type="number"
                  placeholder="2020"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* COR */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Cor
                </label>

                <input
                  value={color}
                  onChange={(event) =>
                    setColor(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Preto"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* COMBUSTÍVEL */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Combustível
                </label>

                <select
                  value={fuel}
                  onChange={(event) =>
                    setFuel(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="">
                    Selecione
                  </option>

                  <option value="Flex">
                    Flex
                  </option>

                  <option value="Gasolina">
                    Gasolina
                  </option>

                  <option value="Etanol">
                    Etanol
                  </option>

                  <option value="Diesel">
                    Diesel
                  </option>

                  <option value="GNV">
                    GNV
                  </option>

                  <option value="Elétrico">
                    Elétrico
                  </option>

                  <option value="Híbrido">
                    Híbrido
                  </option>
                </select>

              </div>

              {/* CHASSI */}
              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Chassi
                </label>

                <input
                  value={chassis}
                  onChange={(event) =>
                    setChassis(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm tracking-wider text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

            </div>

            {/* BOTÕES */}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>

              <button
                onClick={handleSave}
                disabled={
                  saving ||
                  clients.length === 0
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Cadastrar veículo"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* MODAL HISTÓRICO DO VEÍCULO */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-sm">

          <div className="mx-auto w-full max-w-6xl rounded-2xl border border-white/10 bg-[#111111] shadow-2xl">

            {/* HEADER */}
            <div className="border-b border-white/10 p-6">

              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">

                <div>

                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                    Histórico do veículo
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-3">

                    <h2 className="text-2xl font-semibold">
                      {selectedVehicle.brand ||
                        "Veículo"}{" "}
                      {selectedVehicle.model ||
                        ""}
                    </h2>

                    <span className="rounded-lg border border-white/10 bg-black px-3 py-1.5 text-xs font-semibold tracking-widest text-zinc-300">
                      {selectedVehicle.plate}
                    </span>

                  </div>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-zinc-500">

                    <span>
                      👤{" "}
                      {selectedVehicle.clients
                        ?.name ||
                        "Cliente não informado"}
                    </span>

                    {selectedVehicle.year && (
                      <span>
                        📅{" "}
                        {selectedVehicle.year}
                      </span>
                    )}

                    {selectedVehicle.color && (
                      <span>
                        🎨{" "}
                        {selectedVehicle.color}
                      </span>
                    )}

                  </div>

                </div>

                <button
                  onClick={
                    closeVehicleHistory
                  }
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

                {/* DADOS DO VEÍCULO */}
                <section>

                  <div className="mb-4">
                    <h3 className="font-semibold">
                      Dados do veículo
                    </h3>

                    <p className="mt-1 text-xs text-zinc-600">
                      Informações cadastradas para este carro.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Placa
                      </p>

                      <p className="mt-1 text-sm font-semibold tracking-wider">
                        {selectedVehicle.plate}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Marca
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {selectedVehicle.brand ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Modelo
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {selectedVehicle.model ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Ano
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {selectedVehicle.year ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Cor
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {selectedVehicle.color ||
                          "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">
                      <p className="text-[11px] text-zinc-600">
                        Combustível
                      </p>

                      <p className="mt-1 text-sm text-zinc-300">
                        {selectedVehicle.fuel ||
                          "-"}
                      </p>
                    </div>

                  </div>

                  {selectedVehicle.chassis && (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b0b0b] p-4">

                      <p className="text-[11px] text-zinc-600">
                        Chassi
                      </p>

                      <p className="mt-1 text-sm tracking-wider text-zinc-300">
                        {selectedVehicle.chassis}
                      </p>

                    </div>
                  )}

                </section>

                {/* RESUMO */}
                <section>

                  <div className="mb-4">
                    <h3 className="font-semibold">
                      Resumo do veículo
                    </h3>

                    <p className="mt-1 text-xs text-zinc-600">
                      Histórico financeiro e de atendimento.
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
                        Lucro acumulado
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

                {/* ÚLTIMO SERVIÇO */}
                {historySummary.lastService && (
                  <section>

                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Último serviço
                      </h3>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-[#0b0b0b] p-5">

                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <div className="flex flex-wrap items-center gap-2">

                            <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
                              {getCategoryLabel(
                                historySummary.lastService.category
                              )}
                            </span>

                            {isWarrantyActive(
                              historySummary.lastService
                                .warranty_until
                            ) && (
                              <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
                                Garantia ativa
                              </span>
                            )}

                          </div>

                          <p className="mt-3 font-medium">
                            {
                              historySummary.lastService
                                .description
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Serviço em{" "}
                            {formatDate(
                              historySummary.lastService
                                .service_date
                            )}
                          </p>

                        </div>

                        <div className="sm:text-right">

                          <p className="text-xs text-zinc-500">
                            Valor
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {formatCurrency(
                              Number(
                                historySummary.lastService
                                  .amount_paid
                              )
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  </section>
                )}

                {/* HISTÓRICO */}
                <section>

                  <div className="mb-4">
                    <h3 className="font-semibold">
                      Histórico de serviços
                    </h3>

                    <p className="mt-1 text-xs text-zinc-600">
                      Todas as ordens de serviço deste veículo.
                    </p>
                  </div>

                  {vehicleServices.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#0b0b0b] p-8 text-center">

                      <div className="text-3xl">
                        🔧
                      </div>

                      <p className="mt-3 text-sm text-zinc-500">
                        Este veículo ainda não possui serviços registrados.
                      </p>

                    </div>
                  ) : (
                    <div className="space-y-3">

                      {vehicleServices.map(
                        (service) => {

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

                                  {service.payment_date && (
                                    <p className="mt-1 text-[11px] text-zinc-600">
                                      {formatDate(
                                        service.payment_date
                                      )}
                                    </p>
                                  )}
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

                                  {service.repass_date && (
                                    <p className="mt-1 text-[11px] text-zinc-600">
                                      {formatDate(
                                        service.repass_date
                                      )}
                                    </p>
                                  )}
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
                        }
                      )}

                    </div>
                  )}

                </section>

                {/* RESUMO FINANCEIRO */}
                {vehicleServices.length > 0 && (
                  <section>

                    <div className="mb-4">
                      <h3 className="font-semibold">
                        Resumo financeiro
                      </h3>

                      <p className="mt-1 text-xs text-zinc-600">
                        Valores acumulados para este veículo.
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

                    {(historySummary.pendingPayments >
                      0 ||
                      historySummary.pendingRepasses >
                        0) && (
                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

                        {historySummary.pendingPayments >
                          0 && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">

                            <p className="text-xs font-medium text-amber-400">
                              Pagamentos pendentes
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                historySummary.pendingPayments
                              }{" "}
                              ordem
                              {historySummary.pendingPayments ===
                              1
                                ? ""
                                : "ns"}{" "}
                              com pagamento pendente.
                            </p>

                          </div>
                        )}

                        {historySummary.pendingRepasses >
                          0 && (
                          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-3">

                            <p className="text-xs font-medium text-orange-400">
                              Repasses pendentes
                            </p>

                            <p className="mt-1 text-xs text-zinc-500">
                              {
                                historySummary.pendingRepasses
                              }{" "}
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

                {/* FECHAR */}
                <div className="flex justify-end border-t border-white/10 pt-6">

                  <button
                    onClick={
                      closeVehicleHistory
                    }
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

    </main>
  );
}