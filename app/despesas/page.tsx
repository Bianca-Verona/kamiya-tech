"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const categoryLabels: Record<string, string> = {
  MARKETING: "Marketing",
  OPERACIONAL: "Operacional",
  SOFTWARE: "Software / Ferramentas",
  COMBUSTIVEL: "Combustível",
  MATERIAIS: "Materiais",
  TAXAS: "Taxas",
  OUTROS: "Outros",
};

const categoryIcons: Record<string, string> = {
  MARKETING: "📣",
  OPERACIONAL: "🏢",
  SOFTWARE: "💻",
  COMBUSTIVEL: "⛽",
  MATERIAIS: "📦",
  TAXAS: "💳",
  OUTROS: "📋",
};

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

export default function DespesasPage() {
  const supabase = createClient();

  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] =
    useState("TODAS");

  const [description, setDescription] = useState("");
  const [category, setCategory] =
    useState<Expense["category"]>("MARKETING");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  async function loadExpenses() {
    setLoading(true);

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("expense_date", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(
        "Erro ao carregar despesas:",
        error
      );
    }

    setExpenses((data as Expense[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  function resetForm() {
    setDescription("");
    setCategory("MARKETING");
    setAmount("");
    setExpenseDate(
      new Date().toISOString().split("T")[0]
    );
    setNotes("");
  }

  async function handleSave() {
    if (!description.trim()) {
      alert("Informe a descrição da despesa.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    if (!expenseDate) {
      alert("Informe a data da despesa.");
      return;
    }

    setSaving(true);

    const { error } = await supabase
      .from("expenses")
      .insert({
        description: description.trim(),
        category,
        amount: Number(amount),
        expense_date: expenseDate,
        notes: notes.trim() || null,
      });

    if (error) {
      console.error(
        "Erro ao cadastrar despesa:",
        error
      );

      alert("Não foi possível cadastrar a despesa.");

      setSaving(false);
      return;
    }

    setSaving(false);
    setShowModal(false);
    resetForm();

    await loadExpenses();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta despesa?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Erro ao excluir despesa:",
        error
      );

      alert("Não foi possível excluir a despesa.");
      return;
    }

    await loadExpenses();
  }

  const filteredExpenses = useMemo(() => {
    const term = search.toLowerCase().trim();

    return expenses.filter((expense) => {
      const matchesCategory =
        filterCategory === "TODAS" ||
        expense.category === filterCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        expense.description
          .toLowerCase()
          .includes(term) ||
        expense.notes
          ?.toLowerCase()
          .includes(term) ||
        categoryLabels[expense.category]
          .toLowerCase()
          .includes(term)
      );
    });
  }, [expenses, search, filterCategory]);

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [filteredExpenses]);

  const totalMarketing = useMemo(() => {
    return expenses
      .filter(
        (expense) => expense.category === "MARKETING"
      )
      .reduce(
        (total, expense) =>
          total + Number(expense.amount || 0),
        0
      );
  }, [expenses]);

  const totalThisMonth = useMemo(() => {
    const now = new Date();

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return expenses
      .filter((expense) => {
        const date = new Date(
          `${expense.expense_date}T12:00:00`
        );

        return (
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      })
      .reduce(
        (total, expense) =>
          total + Number(expense.amount || 0),
        0
      );
  }, [expenses]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] p-6 text-white lg:p-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
              Gestão Financeira
            </p>

            <h1 className="mt-1 text-3xl font-semibold">
              Despesas
            </h1>

            <p className="mt-2 text-sm text-zinc-500">
              Controle os gastos e despesas da operação.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            + Nova despesa
          </button>

        </div>

        {/* RESUMO */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          {/* TOTAL */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Total filtrado
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalExpenses)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              {filteredExpenses.length} despesa(s)
            </p>

          </div>

          {/* MÊS */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Despesas este mês
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {formatMoney(totalThisMonth)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              Mês atual
            </p>

          </div>

          {/* MARKETING */}
          <div className="rounded-2xl border border-white/10 bg-[#0d0d0d] p-5">

            <p className="text-xs uppercase tracking-wider text-zinc-600">
              Marketing
            </p>

            <p className="mt-2 text-2xl font-semibold text-violet-400">
              {formatMoney(totalMarketing)}
            </p>

            <p className="mt-2 text-xs text-zinc-600">
              Total investido em marketing
            </p>

          </div>

        </div>

        {/* FILTROS */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Buscar despesa..."
            className="flex-1 rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
          />

          <select
            value={filterCategory}
            onChange={(event) =>
              setFilterCategory(event.target.value)
            }
            className="rounded-xl border border-white/10 bg-[#0d0d0d] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="TODAS">
              Todas as categorias
            </option>

            <option value="MARKETING">
              Marketing
            </option>

            <option value="OPERACIONAL">
              Operacional
            </option>

            <option value="SOFTWARE">
              Software / Ferramentas
            </option>

            <option value="COMBUSTIVEL">
              Combustível
            </option>

            <option value="MATERIAIS">
              Materiais
            </option>

            <option value="TAXAS">
              Taxas
            </option>

            <option value="OUTROS">
              Outros
            </option>
          </select>

        </div>

        {/* LISTA */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">

          <div className="border-b border-white/10 px-6 py-4">

            <h2 className="font-semibold">
              Despesas cadastradas
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Controle dos gastos registrados
            </p>

          </div>

          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-zinc-500">
              Carregando despesas...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <div className="text-4xl">
                💸
              </div>

              <h3 className="mt-4 font-medium">
                Nenhuma despesa encontrada
              </h3>

              <p className="mt-2 text-sm text-zinc-500">
                Cadastre uma despesa para começar.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-white/5">

              {filteredExpenses.map((expense) => (

                <div
                  key={expense.id}
                  className="px-6 py-5 transition hover:bg-white/[0.02]"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    {/* DESCRIÇÃO */}
                    <div className="flex gap-4">

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0a] text-xl">
                        {categoryIcons[
                          expense.category
                        ]}
                      </div>

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold">
                            {expense.description}
                          </h3>

                          <span className="rounded-md border border-white/10 bg-black px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-400">
                            {categoryLabels[
                              expense.category
                            ]}
                          </span>

                        </div>

                        {expense.notes && (
                          <p className="mt-2 text-xs text-zinc-600">
                            {expense.notes}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-zinc-500">
                          {formatDate(
                            expense.expense_date
                          )}
                        </p>

                      </div>

                    </div>

                    {/* VALOR E AÇÃO */}
                    <div className="flex items-center justify-between gap-5 lg:justify-end">

                      <p className="text-lg font-semibold text-red-400">
                        {formatMoney(
                          Number(expense.amount)
                        )}
                      </p>

                      <button
                        onClick={() =>
                          handleDelete(expense.id)
                        }
                        className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
                      >
                        Excluir
                      </button>

                    </div>

                  </div>

                </div>

              ))}

            </div>
          )}

        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl">

            {/* HEADER MODAL */}
            <div className="mb-6 flex items-start justify-between">

              <div>

                <p className="text-xs uppercase tracking-[0.2em] text-zinc-600">
                  Gestão financeira
                </p>

                <h2 className="mt-1 text-xl font-semibold">
                  Nova despesa
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

              {/* DESCRIÇÃO */}
              <div className="sm:col-span-2">

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Descrição *
                </label>

                <input
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Ex.: Impulsionamento Instagram"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* CATEGORIA */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Categoria *
                </label>

                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(
                      event.target.value as Expense["category"]
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                >
                  <option value="MARKETING">
                    Marketing
                  </option>

                  <option value="OPERACIONAL">
                    Operacional
                  </option>

                  <option value="SOFTWARE">
                    Software / Ferramentas
                  </option>

                  <option value="COMBUSTIVEL">
                    Combustível
                  </option>

                  <option value="MATERIAIS">
                    Materiais
                  </option>

                  <option value="TAXAS">
                    Taxas
                  </option>

                  <option value="OUTROS">
                    Outros
                  </option>

                </select>

              </div>

              {/* VALOR */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Valor *
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(event.target.value)
                  }
                  placeholder="0,00"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

              {/* DATA */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Data *
                </label>

                <input
                  type="date"
                  value={expenseDate}
                  onChange={(event) =>
                    setExpenseDate(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none focus:border-white/30"
                />

              </div>

              {/* OBSERVAÇÃO */}
              <div>

                <label className="mb-2 block text-xs font-medium text-zinc-400">
                  Observação
                </label>

                <input
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-white/30"
                />

              </div>

            </div>

            {/* PREVIEW */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a0a0a] p-5">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs uppercase tracking-wider text-zinc-600">
                    Nova despesa
                  </p>

                  <p className="mt-1 text-lg font-semibold">
                    {description || "Sem descrição"}
                  </p>

                </div>

                <p className="text-xl font-semibold text-red-400">
                  {formatMoney(Number(amount) || 0)}
                </p>

              </div>

              <p className="mt-3 text-xs text-zinc-600">
                {categoryLabels[category]}
              </p>

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
                disabled={saving}
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Salvando..."
                  : "Cadastrar despesa"}
              </button>

            </div>

          </div>
        </div>
      )}
    </main>
  );
}