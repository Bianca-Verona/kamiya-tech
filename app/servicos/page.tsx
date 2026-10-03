"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Client = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
};

type Vehicle = {
  id: string;
  client_id: string;
  plate: string;
  brand: string | null;
  model: string | null;
  year?: number | null;
};

type Receipt = {
  id: string;
  service_order_id: string;
  receipt_type: "PAGAMENTO_CLIENTE" | "REPASSE_OFICINA";
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
};

type ServiceCategory =
  | "EGR"
  | "SOM_ACESSORIOS"
  | "PROGRAMACAO"
  | "ECU";

type PaymentMethod =
  | "PIX"
  | "DINHEIRO"
  | "DEBITO"
  | "CREDITO"
  | "TRANSFERENCIA"
  | "OUTRO";

type PaymentStatus =
  | "PENDENTE"
  | "PAGO"
  | "CANCELADO";

type RepassStatus =
  | "PENDENTE"
  | "REPASSADO";

type ServiceOrder = {
  id: string;
  client_id: string;
  vehicle_id: string;

  category: ServiceCategory;

  description: string;
  service_date: string;
  warranty_until: string;

  amount_paid: number;
  shop_repass: number;
  map_cost: number;
  net_profit: number;

  notes: string | null;

  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus;
  payment_date: string | null;

  repass_status: RepassStatus;
  repass_date: string | null;

  clients?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;

  vehicles?: {
    plate: string;
    brand: string | null;
    model: string | null;
    year?: number | null;
  } | null;
};

const categoryLabels: Record<string, string> = {
  EGR: "EGR",
  SOM_ACESSORIOS: "Som e acessórios",
  PROGRAMACAO: "Programação",
  ECU: "ECU",
};

const paymentMethodLabels: Record<string, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferência",
  OUTRO: "Outro",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function formatDate(date: string | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T12:00:00`)
  );
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]/g, "-");
}

function formatFileSize(size: number | null) {
  if (!size) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ServicosPage() {
  const supabase = createClient();

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [services, setServices] = useState<ServiceOrder[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] =
    useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showDetails, setShowDetails] =
    useState(false);

  const [editingService, setEditingService] =
    useState<ServiceOrder | null>(null);

  const [selectedService, setSelectedService] =
    useState<ServiceOrder | null>(null);

  const [clientId, setClientId] = useState("");
  const [vehicleId, setVehicleId] = useState("");

  const [category, setCategory] =
    useState<ServiceCategory>("EGR");

  const [description, setDescription] =
    useState("");

  const [serviceDate, setServiceDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [amountPaid, setAmountPaid] =
    useState("");

  const [shopRepass, setShopRepass] =
    useState("");

  const [mapCost, setMapCost] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("PIX");

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("PENDENTE");

  const [paymentDate, setPaymentDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [repassStatus, setRepassStatus] =
    useState<RepassStatus>("PENDENTE");

  const [repassDate, setRepassDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [paymentReceipt, setPaymentReceipt] =
    useState<File | null>(null);

  const [repassReceipt, setRepassReceipt] =
    useState<File | null>(null);

  const [search, setSearch] =
    useState("");

  async function loadData() {
    setLoading(true);

    const [
      { data: clientsData, error: clientsError },
      { data: vehiclesData, error: vehiclesError },
      { data: servicesData, error: servicesError },
      { data: receiptsData, error: receiptsError },
    ] = await Promise.all([
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

      supabase
        .from("service_orders")
        .select(`
          *,
          clients (
            name,
            phone,
            email
          ),
          vehicles (
            plate,
            brand,
            model,
            year
          )
        `)
        .order("service_date", {
          ascending: false,
        })
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("service_receipts")
        .select("*")
        .order("created_at", {
          ascending: false,
        }),
    ]);

    if (clientsError) {
      console.error(
        "Erro ao carregar clientes:",
        clientsError
      );
    }

    if (vehiclesError) {
      console.error(
        "Erro ao carregar veículos:",
        vehiclesError
      );
    }

    if (servicesError) {
      console.error(
        "Erro ao carregar serviços:",
        servicesError
      );
    }

    if (receiptsError) {
      console.error(
        "Erro ao carregar comprovantes:",
        receiptsError
      );
    }

    setClients(clientsData || []);

    setVehicles(
      (vehiclesData as Vehicle[]) || []
    );

    setServices(
      (servicesData as ServiceOrder[]) || []
    );

    setReceipts(
      (receiptsData as Receipt[]) || []
    );

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const clientVehicles = useMemo(() => {
    if (!clientId) return [];

    return vehicles.filter(
      (vehicle) =>
        vehicle.client_id === clientId
    );
  }, [vehicles, clientId]);

  const previewProfit =
    (Number(amountPaid) || 0) -
    (Number(shopRepass) || 0) -
    (Number(mapCost) || 0);

  function resetForm() {
    setClientId("");
    setVehicleId("");

    setCategory("EGR");
    setDescription("");

    setServiceDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setAmountPaid("");
    setShopRepass("");
    setMapCost("");

    setNotes("");

    setPaymentMethod("PIX");
    setPaymentStatus("PENDENTE");

    setPaymentDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setRepassStatus("PENDENTE");

    setRepassDate(
      new Date()
        .toISOString()
        .split("T")[0]
    );

    setPaymentReceipt(null);
    setRepassReceipt(null);

    setEditingService(null);
  }

  function handleClientChange(
    value: string
  ) {
    setClientId(value);
    setVehicleId("");
  }

  function handleCategoryChange(
    value: ServiceCategory
  ) {
    setCategory(value);

    if (
      value !== "EGR" &&
      value !== "ECU"
    ) {
      setMapCost("");
    }
  }

  function openNewService() {
    resetForm();
    setShowModal(true);
  }

  function openEditService(
    service: ServiceOrder
  ) {
    setEditingService(service);

    setClientId(service.client_id);
    setVehicleId(service.vehicle_id);

    setCategory(service.category);
    setDescription(service.description);

    setServiceDate(
      service.service_date
    );

    setAmountPaid(
      String(service.amount_paid ?? "")
    );

    setShopRepass(
      String(service.shop_repass ?? "")
    );

    setMapCost(
      String(service.map_cost ?? "")
    );

    setNotes(service.notes || "");

    setPaymentMethod(
      service.payment_method || "PIX"
    );

    setPaymentStatus(
      service.payment_status
    );

    setPaymentDate(
      service.payment_date ||
        new Date()
          .toISOString()
          .split("T")[0]
    );

    setRepassStatus(
      service.repass_status
    );

    setRepassDate(
      service.repass_date ||
        new Date()
          .toISOString()
          .split("T")[0]
    );

    setPaymentReceipt(null);
    setRepassReceipt(null);

    setShowModal(true);
  }

  function openDetails(
    service: ServiceOrder
  ) {
    setSelectedService(service);
    setShowDetails(true);
  }

  async function uploadReceipt(
    file: File,
    serviceOrderId: string,
    receiptType:
      | "PAGAMENTO_CLIENTE"
      | "REPASSE_OFICINA"
  ) {
    const safeName =
      sanitizeFileName(file.name);

    const filePath =
      `${serviceOrderId}/${receiptType.toLowerCase()}-${Date.now()}-${safeName}`;

    const {
      error: uploadError,
    } = await supabase.storage
      .from("service-receipts")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      error: insertError,
    } = await supabase
      .from("service_receipts")
      .insert({
        service_order_id:
          serviceOrderId,

        receipt_type:
          receiptType,

        file_name:
          file.name,

        file_path:
          filePath,

        file_type:
          file.type || null,

        file_size:
          file.size,
      });

    if (insertError) {
      await supabase.storage
        .from("service-receipts")
        .remove([filePath]);

      throw insertError;
    }
  }

  async function replaceReceipt(
    file: File,
    serviceOrderId: string,
    receiptType:
      | "PAGAMENTO_CLIENTE"
      | "REPASSE_OFICINA"
  ) {
    const existing =
      receipts.find(
        (receipt) =>
          receipt.service_order_id ===
            serviceOrderId &&
          receipt.receipt_type ===
            receiptType
      );

    if (existing) {
      await supabase.storage
        .from("service-receipts")
        .remove([
          existing.file_path,
        ]);

      await supabase
        .from("service_receipts")
        .delete()
        .eq(
          "id",
          existing.id
        );
    }

    await uploadReceipt(
      file,
      serviceOrderId,
      receiptType
    );
  }

  async function handleSave() {
    if (!clientId) {
      alert(
        "Selecione um cliente."
      );
      return;
    }

    if (!vehicleId) {
      alert(
        "Selecione um veículo."
      );
      return;
    }

    if (!description.trim()) {
      alert(
        "Informe a descrição do serviço."
      );
      return;
    }

    if (!amountPaid) {
      alert(
        "Informe o valor do serviço."
      );
      return;
    }

    if (
      paymentStatus === "PAGO" &&
      !paymentDate
    ) {
      alert(
        "Informe a data do pagamento."
      );
      return;
    }

    if (
      repassStatus === "REPASSADO" &&
      Number(shopRepass) <= 0
    ) {
      alert(
        "Informe o valor do repasse antes de marcar como repassado."
      );
      return;
    }

    setSaving(true);

    const payload = {
      client_id: clientId,
      vehicle_id: vehicleId,
      category,
      description:
        description.trim(),

      service_date:
        serviceDate,

      amount_paid:
        Number(amountPaid) || 0,

      shop_repass:
        Number(shopRepass) || 0,

      map_cost:
        Number(mapCost) || 0,

      notes:
        notes.trim() || null,

      payment_method:
        paymentMethod,

      payment_status:
        paymentStatus,

      payment_date:
        paymentStatus === "PAGO"
          ? paymentDate
          : null,

      repass_status:
        repassStatus,

      repass_date:
        repassStatus ===
        "REPASSADO"
          ? repassDate
          : null,
    };

    let serviceId =
      editingService?.id || null;

    if (editingService) {
      const {
        error,
      } = await supabase
        .from("service_orders")
        .update(payload)
        .eq(
          "id",
          editingService.id
        );

      if (error) {
        console.error(
          "Erro ao atualizar serviço:",
          error
        );

        alert(
          "Não foi possível atualizar o serviço."
        );

        setSaving(false);
        return;
      }
    } else {
      const {
        data: service,
        error,
      } = await supabase
        .from("service_orders")
        .insert(payload)
        .select("id")
        .single();

      if (error || !service) {
        console.error(
          "Erro ao cadastrar serviço:",
          error
        );

        alert(
          "Não foi possível cadastrar o serviço."
        );

        setSaving(false);
        return;
      }

      serviceId = service.id;
    }

    try {
      setUploadingReceipt(true);

      if (
        paymentReceipt &&
        serviceId
      ) {
        if (editingService) {
          await replaceReceipt(
            paymentReceipt,
            serviceId,
            "PAGAMENTO_CLIENTE"
          );
        } else {
          await uploadReceipt(
            paymentReceipt,
            serviceId,
            "PAGAMENTO_CLIENTE"
          );
        }
      }

      if (
        repassReceipt &&
        serviceId
      ) {
        if (editingService) {
          await replaceReceipt(
            repassReceipt,
            serviceId,
            "REPASSE_OFICINA"
          );
        } else {
          await uploadReceipt(
            repassReceipt,
            serviceId,
            "REPASSE_OFICINA"
          );
        }
      }
    } catch (error) {
      console.error(
        "Erro ao enviar comprovante:",
        error
      );

      alert(
        "A OS foi salva, mas houve um problema ao enviar um dos comprovantes."
      );
    } finally {
      setUploadingReceipt(false);
    }

    setSaving(false);

    setShowModal(false);

    resetForm();

    await loadData();
  }

  async function openReceipt(
    filePath: string
  ) {
    const {
      data,
      error,
    } = await supabase.storage
      .from("service-receipts")
      .createSignedUrl(
        filePath,
        60 * 10
      );

    if (
      error ||
      !data?.signedUrl
    ) {
      console.error(
        "Erro ao gerar link do comprovante:",
        error
      );

      alert(
        "Não foi possível abrir o comprovante."
      );

      return;
    }

    window.open(
      data.signedUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleDelete(
    id: string
  ) {
    const confirmed =
      window.confirm(
        "Tem certeza que deseja excluir este serviço?\n\nOs comprovantes vinculados também serão excluídos."
      );

    if (!confirmed) return;

    const serviceReceipts =
      receipts.filter(
        (receipt) =>
          receipt.service_order_id ===
          id
      );

    if (
      serviceReceipts.length > 0
    ) {
      const filePaths =
        serviceReceipts.map(
          (receipt) =>
            receipt.file_path
        );

      const {
        error: storageError,
      } = await supabase.storage
        .from("service-receipts")
        .remove(filePaths);

      if (storageError) {
        console.error(
          "Erro ao excluir arquivos:",
          storageError
        );

        alert(
          "Não foi possível excluir os comprovantes."
        );

        return;
      }
    }

    const {
      error: receiptsError,
    } = await supabase
      .from("service_receipts")
      .delete()
      .eq(
        "service_order_id",
        id
      );

    if (receiptsError) {
      console.error(
        "Erro ao excluir comprovantes:",
        receiptsError
      );

      alert(
        "Não foi possível excluir os comprovantes."
      );

      return;
    }

    const {
      error,
    } = await supabase
      .from("service_orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      alert(
        "Não foi possível excluir o serviço."
      );

      return;
    }

    await loadData();
  }

  const filteredServices =
    useMemo(() => {
      const term =
        search
          .toLowerCase()
          .trim();

      if (!term)
        return services;

      return services.filter(
        (service) => {
          const clientName =
            service.clients
              ?.name || "";

          const vehicle =
            service.vehicles;

          return (
            clientName
              .toLowerCase()
              .includes(term) ||
            service.description
              .toLowerCase()
              .includes(term) ||
            service.category
              .toLowerCase()
              .includes(term) ||
            vehicle?.plate
              ?.toLowerCase()
              .includes(term) ||
            vehicle?.model
              ?.toLowerCase()
              .includes(term)
          );
        }
      );
    }, [services, search]);

  function getServiceReceipts(
    serviceId: string
  ) {
    return receipts.filter(
      (receipt) =>
        receipt.service_order_id ===
        serviceId
    );
  }

  function getPaymentReceipt(
    serviceId: string
  ) {
    return receipts.find(
      (receipt) =>
        receipt.service_order_id ===
          serviceId &&
        receipt.receipt_type ===
          "PAGAMENTO_CLIENTE"
    );
  }

  function getRepassReceipt(
    serviceId: string
  ) {
    return receipts.find(
      (receipt) =>
        receipt.service_order_id ===
          serviceId &&
        receipt.receipt_type ===
          "REPASSE_OFICINA"
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-6 text-white lg:p-10">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Gestão Automotiva
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Serviços
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Controle as ordens de serviço,
              pagamentos, repasses,
              comprovantes, lucro e garantias.
            </p>

          </div>

          <button
            onClick={
              openNewService
            }
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            + Novo serviço
          </button>

        </div>

        {/* BUSCA */}

        <div className="mb-6">

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Buscar por cliente, placa, modelo ou serviço..."
            className="w-full rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
          />

        </div>

        {/* LISTA */}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

          <div className="border-b border-white/10 px-6 py-4">

            <h2 className="font-semibold">
              Ordens de serviço
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              {filteredServices.length} serviço(s)
            </p>

          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Carregando serviços...
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <div className="text-4xl">
                🔧
              </div>

              <h3 className="mt-4 font-medium">
                Nenhum serviço cadastrado
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Cadastre o primeiro serviço
                para começar.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {filteredServices.map(
                (service) => {

                  const serviceReceipts =
                    getServiceReceipts(
                      service.id
                    );

                  const paymentReceiptExists =
                    serviceReceipts.some(
                      (receipt) =>
                        receipt.receipt_type ===
                        "PAGAMENTO_CLIENTE"
                    );

                  const repassReceiptExists =
                    serviceReceipts.some(
                      (receipt) =>
                        receipt.receipt_type ===
                        "REPASSE_OFICINA"
                    );

                  return (
                    <div
                      key={service.id}
                      className="px-6 py-5 transition hover:bg-white/[0.02]"
                    >

                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                        {/* SERVIÇO */}

                        <div className="flex gap-4">

                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a] text-xl">
                            🔧
                          </div>

                          <div>

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="font-semibold">
                                {service.description}
                              </h3>

                              <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                                {
                                  categoryLabels[
                                    service.category
                                  ]
                                }
                              </span>

                            </div>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">

                              <span>
                                Cliente:{" "}
                                <span className="text-zinc-300">
                                  {
                                    service
                                      .clients
                                      ?.name ||
                                    "-"
                                  }
                                </span>
                              </span>

                              <span>
                                Veículo:{" "}
                                <span className="text-zinc-300">
                                  {
                                    service
                                      .vehicles
                                      ?.brand
                                  }{" "}
                                  {
                                    service
                                      .vehicles
                                      ?.model
                                  }
                                </span>
                              </span>

                              <span>
                                Placa:{" "}
                                <span className="text-zinc-300">
                                  {
                                    service
                                      .vehicles
                                      ?.plate
                                  }
                                </span>
                              </span>

                              <span>
                                Data:{" "}
                                <span className="text-zinc-300">
                                  {formatDate(
                                    service.service_date
                                  )}
                                </span>
                              </span>

                            </div>

                            {/* STATUS */}

                            <div className="mt-3 flex flex-wrap gap-2">

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                  service.payment_status ===
                                  "PAGO"
                                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                                    : service.payment_status ===
                                      "CANCELADO"
                                    ? "border-red-500/20 bg-red-500/10 text-red-400"
                                    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                                }`}
                              >
                                Pagamento:{" "}
                                {
                                  service.payment_status
                                }
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                  service.repass_status ===
                                  "REPASSADO"
                                    ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
                                    : "border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                                }`}
                              >
                                Repasse:{" "}
                                {
                                  service.repass_status
                                }
                              </span>

                              {paymentReceiptExists && (
                                <button
                                  onClick={() => {

                                    const receipt =
                                      serviceReceipts.find(
                                        (item) =>
                                          item.receipt_type ===
                                          "PAGAMENTO_CLIENTE"
                                      );

                                    if (
                                      receipt
                                    ) {
                                      openReceipt(
                                        receipt.file_path
                                      );
                                    }

                                  }}
                                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 transition hover:bg-white/5"
                                >
                                  📎 Pagamento
                                </button>
                              )}

                              {repassReceiptExists && (
                                <button
                                  onClick={() => {

                                    const receipt =
                                      serviceReceipts.find(
                                        (item) =>
                                          item.receipt_type ===
                                          "REPASSE_OFICINA"
                                      );

                                    if (
                                      receipt
                                    ) {
                                      openReceipt(
                                        receipt.file_path
                                      );
                                    }

                                  }}
                                  className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-zinc-300 transition hover:bg-white/5"
                                >
                                  📎 Repasse
                                </button>
                              )}

                            </div>

                          </div>

                        </div>

                        {/* VALORES */}

                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">

                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                              Pago
                            </p>

                            <p className="mt-1 text-sm font-semibold">
                              {formatMoney(
                                Number(
                                  service.amount_paid
                                )
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                              Repasse
                            </p>

                            <p className="mt-1 text-sm text-zinc-400">
                              {formatMoney(
                                Number(
                                  service.shop_repass
                                )
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                              Lucro
                            </p>

                            <p className="mt-1 text-sm font-semibold text-emerald-400">
                              {formatMoney(
                                Number(
                                  service.net_profit
                                )
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                              Garantia
                            </p>

                            <p className="mt-1 text-sm text-zinc-300">
                              {formatDate(
                                service.warranty_until
                              )}
                            </p>
                          </div>

                        </div>

                        {/* AÇÕES */}

                        <div className="flex flex-wrap gap-2 self-start lg:self-auto">

                          <button
                            onClick={() =>
                              openDetails(
                                service
                              )
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                          >
                            👁️ Detalhes
                          </button>

                          <button
                            onClick={() =>
                              openEditService(
                                service
                              )
                            }
                            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            onClick={() =>
                              handleDelete(
                                service.id
                              )
                            }
                            className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
                          >
                            Excluir
                          </button>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>
      </div>

      {/* MODAL NOVO / EDITAR */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

            <div className="mb-6 flex items-start justify-between">

              <div>

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Ordem de serviço
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  {editingService
                    ? "Editar serviço"
                    : "Novo serviço"}
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

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Cliente *
                </label>

                <select
                  value={clientId}
                  onChange={(event) =>
                    handleClientChange(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="">
                    Selecione
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

              {/* VEÍCULO */}

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Veículo *
                </label>

                <select
                  value={vehicleId}
                  onChange={(event) =>
                    setVehicleId(
                      event.target.value
                    )
                  }
                  disabled={!clientId}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <option value="">
                    {clientId
                      ? "Selecione"
                      : "Selecione o cliente primeiro"}
                  </option>

                  {clientVehicles.map(
                    (vehicle) => (
                      <option
                        key={vehicle.id}
                        value={vehicle.id}
                      >
                        {vehicle.brand}{" "}
                        {vehicle.model} -{" "}
                        {vehicle.plate}
                      </option>
                    )
                  )}

                </select>
              </div>

              {/* CATEGORIA */}

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Categoria *
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    handleCategoryChange(
                      event.target
                        .value as ServiceCategory
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >

                  <option value="EGR">
                    EGR
                  </option>

                  <option value="SOM_ACESSORIOS">
                    Som e acessórios
                  </option>

                  <option value="PROGRAMACAO">
                    Programação
                  </option>

                  <option value="ECU">
                    ECU
                  </option>

                </select>
              </div>

              {/* DATA */}

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Data do serviço *
                </label>

                <input
                  type="date"
                  value={serviceDate}
                  onChange={(event) =>
                    setServiceDate(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                />
              </div>

              {/* DESCRIÇÃO */}

              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Descrição do serviço *
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Ex.: Remoção de EGR e programação da ECU"
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* VALOR */}

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Valor do serviço *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(event) =>
                    setAmountPaid(
                      event.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />
              </div>

              {/* REPASSE */}

              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Repasse para oficina
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shopRepass}
                  onChange={(event) =>
                    setShopRepass(
                      event.target.value
                    )
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />
              </div>

              {/* MAPA */}

              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Custo do mapa

                  {category !== "EGR" &&
                    category !== "ECU" && (
                      <span className="ml-2 text-zinc-600">
                        disponível somente para EGR e ECU
                      </span>
                    )}

                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={mapCost}
                  onChange={(event) =>
                    setMapCost(
                      event.target.value
                    )
                  }
                  disabled={
                    category !== "EGR" &&
                    category !== "ECU"
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                />

              </div>

              {/* OBSERVAÇÕES */}

              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Observações
                </label>

                <textarea
                  value={notes}
                  onChange={(event) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Observações internas sobre o serviço, pagamento, veículo ou cliente..."
                  className="w-full resize-none rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

            </div>

            {/* PAGAMENTO */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

              <div className="mb-4">

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Pagamento do cliente
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  O cliente paga diretamente para a oficina.
                </p>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Forma de pagamento
                  </label>

                  <select
                    value={
                      paymentMethod
                    }
                    onChange={(event) =>
                      setPaymentMethod(
                        event.target
                          .value as PaymentMethod
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                  >

                    <option value="PIX">
                      Pix
                    </option>

                    <option value="DINHEIRO">
                      Dinheiro
                    </option>

                    <option value="DEBITO">
                      Débito
                    </option>

                    <option value="CREDITO">
                      Crédito
                    </option>

                    <option value="TRANSFERENCIA">
                      Transferência
                    </option>

                    <option value="OUTRO">
                      Outro
                    </option>

                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Status do pagamento
                  </label>

                  <select
                    value={
                      paymentStatus
                    }
                    onChange={(event) =>
                      setPaymentStatus(
                        event.target
                          .value as PaymentStatus
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                  >

                    <option value="PENDENTE">
                      Pendente
                    </option>

                    <option value="PAGO">
                      Pago
                    </option>

                    <option value="CANCELADO">
                      Cancelado
                    </option>

                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Data do pagamento
                  </label>

                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(event) =>
                      setPaymentDate(
                        event.target.value
                      )
                    }
                    disabled={
                      paymentStatus !==
                      "PAGO"
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </div>

                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Comprovante do cliente
                    <span className="ml-2 text-zinc-600">
                      opcional
                    </span>
                  </label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(event) =>
                      setPaymentReceipt(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-2.5 text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-zinc-200"
                  />

                  {paymentReceipt && (
                    <p className="mt-2 truncate text-xs text-emerald-400">
                      📎{" "}
                      {paymentReceipt.name}
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* REPASSE */}

            <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

              <div className="mb-4">

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Repasse da oficina
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Registre quando a oficina repassar o valor.
                </p>

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Status do repasse
                  </label>

                  <select
                    value={
                      repassStatus
                    }
                    onChange={(event) =>
                      setRepassStatus(
                        event.target
                          .value as RepassStatus
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                  >

                    <option value="PENDENTE">
                      Pendente
                    </option>

                    <option value="REPASSADO">
                      Repassado
                    </option>

                  </select>

                </div>

                <div>

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Data do repasse
                  </label>

                  <input
                    type="date"
                    value={repassDate}
                    onChange={(event) =>
                      setRepassDate(
                        event.target.value
                      )
                    }
                    disabled={
                      repassStatus !==
                      "REPASSADO"
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none focus:border-white/30 disabled:cursor-not-allowed disabled:opacity-40"
                  />

                </div>

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-xs font-medium text-zinc-400">
                    Comprovante do repasse
                    <span className="ml-2 text-zinc-600">
                      opcional
                    </span>
                  </label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(event) =>
                      setRepassReceipt(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#111111] px-3 py-2.5 text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold file:text-black hover:file:bg-zinc-200"
                  />

                  {repassReceipt && (
                    <p className="mt-2 truncate text-xs text-blue-400">
                      📎{" "}
                      {repassReceipt.name}
                    </p>
                  )}

                </div>

              </div>

            </div>

            {/* PREVIEW */}

            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

              <div className="grid gap-5 sm:grid-cols-3">

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Cliente paga
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {formatMoney(
                      Number(
                        amountPaid
                      ) || 0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Repasse
                  </p>

                  <p className="mt-1 text-lg font-semibold text-zinc-400">
                    {formatMoney(
                      Number(
                        shopRepass
                      ) || 0
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Lucro líquido
                  </p>

                  <p
                    className={`mt-1 text-lg font-semibold ${
                      previewProfit >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatMoney(
                      previewProfit
                    )}
                  </p>
                </div>

              </div>

              <div className="mt-4 border-t border-white/5 pt-4 text-xs text-zinc-600">
                Pago - Repasse - Custo do mapa = Lucro líquido
              </div>

            </div>

            {/* BOTÕES */}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                disabled={saving}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                onClick={
                  handleSave
                }
                disabled={
                  saving ||
                  uploadingReceipt
                }
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : uploadingReceipt
                  ? "Enviando comprovantes..."
                  : editingService
                  ? "Salvar alterações"
                  : "Cadastrar serviço"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* MODAL DETALHES */}

      {showDetails &&
        selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

            <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

              {/* HEADER */}

              <div className="mb-6 flex items-start justify-between">

                <div>

                  <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                    Ordem de serviço
                  </p>

                  <h2 className="mt-1 text-2xl font-semibold">
                    {selectedService.description}
                  </h2>

                  <p className="mt-1 text-sm text-zinc-500">
                    {categoryLabels[
                      selectedService.category
                    ]}
                  </p>

                </div>

                <button
                  onClick={() => {
                    setShowDetails(
                      false
                    );
                    setSelectedService(
                      null
                    );
                  }}
                  className="text-xl text-zinc-500 transition hover:text-white"
                >
                  ×
                </button>

              </div>

              {/* CLIENTE / VEÍCULO */}

              <div className="grid gap-4 sm:grid-cols-2">

                <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Cliente
                  </p>

                  <p className="mt-2 font-semibold">
                    {
                      selectedService
                        .clients?.name ||
                      "-"
                    }
                  </p>

                  {selectedService
                    .clients
                    ?.phone && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {
                        selectedService
                          .clients.phone
                      }
                    </p>
                  )}

                  {selectedService
                    .clients
                    ?.email && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {
                        selectedService
                          .clients.email
                      }
                    </p>
                  )}

                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Veículo
                  </p>

                  <p className="mt-2 font-semibold">
                    {
                      selectedService
                        .vehicles
                        ?.brand
                    }{" "}
                    {
                      selectedService
                        .vehicles
                        ?.model
                    }
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    Placa:{" "}
                    {
                      selectedService
                        .vehicles
                        ?.plate
                    }
                  </p>

                  {selectedService
                    .vehicles
                    ?.year && (
                    <p className="mt-1 text-sm text-zinc-500">
                      Ano:{" "}
                      {
                        selectedService
                          .vehicles.year
                      }
                    </p>
                  )}

                </div>

              </div>

              {/* SERVIÇO */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Serviço
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Categoria
                    </p>

                    <p className="mt-1 text-sm">
                      {
                        categoryLabels[
                          selectedService
                            .category
                        ]
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Data
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedService
                          .service_date
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Garantia até
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedService
                          .warranty_until
                      )}
                    </p>
                  </div>

                </div>

                <div className="mt-5 border-t border-white/5 pt-5">

                  <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                    Descrição
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                    {
                      selectedService
                        .description
                    }
                  </p>

                </div>

                {selectedService
                  .notes && (
                  <div className="mt-5 border-t border-white/5 pt-5">

                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Observações
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {
                        selectedService
                          .notes
                      }
                    </p>

                  </div>
                )}

              </div>

              {/* FINANCEIRO */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Financeiro
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Valor do serviço
                    </p>

                    <p className="mt-1 text-lg font-semibold">
                      {formatMoney(
                        Number(
                          selectedService
                            .amount_paid
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Custo do mapa
                    </p>

                    <p className="mt-1 text-lg">
                      {formatMoney(
                        Number(
                          selectedService
                            .map_cost
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Forma de pagamento
                    </p>

                    <p className="mt-1 text-sm">
                      {selectedService
                        .payment_method
                        ? paymentMethodLabels[
                            selectedService
                              .payment_method
                          ]
                        : "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Data do pagamento
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedService
                          .payment_date
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Repasse
                    </p>

                    <p className="mt-1 text-sm">
                      {formatMoney(
                        Number(
                          selectedService
                            .shop_repass
                        )
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                      Data do repasse
                    </p>

                    <p className="mt-1 text-sm">
                      {formatDate(
                        selectedService
                          .repass_date
                      )}
                    </p>
                  </div>

                </div>

                <div className="mt-5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">

                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Lucro líquido
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-emerald-400">
                    {formatMoney(
                      Number(
                        selectedService
                          .net_profit
                      )
                    )}
                  </p>

                </div>

              </div>

              {/* COMPROVANTES */}

              <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Comprovantes
                </p>

                <div className="mt-4 space-y-3">

                  {(() => {
                    const paymentReceipt =
                      getPaymentReceipt(
                        selectedService.id
                      );

                    const repassReceipt =
                      getRepassReceipt(
                        selectedService.id
                      );

                    return (
                      <>
                        <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-[#111111] p-4 sm:flex-row sm:items-center">

                          <div>

                            <p className="text-sm font-medium">
                              Pagamento do cliente
                            </p>

                            {paymentReceipt ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {
                                  paymentReceipt
                                    .file_name
                                }{" "}
                                {formatFileSize(
                                  paymentReceipt
                                    .file_size
                                )}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-zinc-600">
                                Nenhum comprovante anexado.
                              </p>
                            )}

                          </div>

                          {paymentReceipt && (
                            <button
                              onClick={() =>
                                openReceipt(
                                  paymentReceipt.file_path
                                )
                              }
                              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                            >
                              📎 Abrir
                            </button>
                          )}

                        </div>

                        <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-[#111111] p-4 sm:flex-row sm:items-center">

                          <div>

                            <p className="text-sm font-medium">
                              Repasse da oficina
                            </p>

                            {repassReceipt ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                {
                                  repassReceipt
                                    .file_name
                                }{" "}
                                {formatFileSize(
                                  repassReceipt
                                    .file_size
                                )}
                              </p>
                            ) : (
                              <p className="mt-1 text-xs text-zinc-600">
                                Nenhum comprovante anexado.
                              </p>
                            )}

                          </div>

                          {repassReceipt && (
                            <button
                              onClick={() =>
                                openReceipt(
                                  repassReceipt.file_path
                                )
                              }
                              className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300 transition hover:bg-white/5 hover:text-white"
                            >
                              📎 Abrir
                            </button>
                          )}

                        </div>
                      </>
                    );
                  })()}

                </div>

              </div>

              {/* AÇÕES */}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">

                <button
                  onClick={() => {
                    setShowDetails(
                      false
                    );
                    setSelectedService(
                      null
                    );
                  }}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
                >
                  Fechar
                </button>

                <button
                  onClick={() => {
                    const service =
                      selectedService;

                    setShowDetails(
                      false
                    );

                    setSelectedService(
                      null
                    );

                    openEditService(
                      service
                    );
                  }}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
                >
                  ✏️ Editar OS
                </button>

              </div>

            </div>

          </div>
        )}

    </main>
  );
}