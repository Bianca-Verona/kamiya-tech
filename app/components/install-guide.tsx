"use client";

import { useEffect, useState } from "react";

export default function InstallGuide() {
  const [show, setShow] = useState(false);
  const [device, setDevice] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    const alreadySeen = localStorage.getItem("kamiya-install-guide");

    if (alreadySeen) return;

    const userAgent = navigator.userAgent.toLowerCase();

    const isIOS =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const isAndroid = /android/.test(userAgent);

    if (isIOS) {
      setDevice("ios");
    } else if (isAndroid) {
      setDevice("android");
    } else {
      setDevice("other");
    }

    const timer = setTimeout(() => {
      setShow(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  function closeGuide() {
    localStorage.setItem("kamiya-install-guide", "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#101010] p-6 text-white shadow-2xl">
        
        <button
          onClick={closeGuide}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-300 transition hover:bg-white/20"
          aria-label="Fechar"
        >
          ✕
        </button>

        <div className="mb-5 pr-8">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            📲
          </div>

          <h2 className="text-2xl font-bold">
            Instale o Kamiya Tech
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Coloque o Kamiya Tech na tela inicial do celular e acesse o
            sistema como um aplicativo.
          </p>
        </div>

        {device === "ios" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-white">
              🍎 Como instalar no iPhone
            </h3>

            <Step number="1">
              Abra o Kamiya Tech pelo <strong>Safari</strong>.
            </Step>

            <Step number="2">
              Toque no botão <strong>Compartilhar</strong> ⬆️.
            </Step>

            <Step number="3">
              Role o menu e toque em{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </Step>

            <Step number="4">
              Toque em <strong>Adicionar</strong>.
            </Step>
          </div>
        )}

        {device === "android" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-white">
              🤖 Como instalar no Android
            </h3>

            <Step number="1">
              Abra o Kamiya Tech pelo <strong>Google Chrome</strong>.
            </Step>

            <Step number="2">
              Toque nos <strong>3 pontinhos ⋮</strong> no canto superior.
            </Step>

            <Step number="3">
              Toque em <strong>Instalar aplicativo</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </Step>

            <Step number="4">
              Confirme tocando em <strong>Instalar</strong> ou{" "}
              <strong>Adicionar</strong>.
            </Step>
          </div>
        )}

        {device === "other" && (
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-sm leading-6 text-gray-300">
              📱 Abra este site pelo celular para ver as instruções
              específicas para instalação na tela inicial.
            </p>
          </div>
        )}

        <button
          onClick={closeGuide}
          className="mt-6 w-full rounded-2xl bg-white py-3.5 font-semibold text-black transition hover:bg-gray-200"
        >
          Entendi
        </button>

        <p className="mt-4 text-center text-xs text-gray-500">
          Kamiya Tech • Sistema de gestão
        </p>
      </div>
    </div>
  );
}

function Step({
  number,
  children,
}: {
  number: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/5 p-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
        {number}
      </div>

      <p className="text-sm leading-6 text-gray-300">
        {children}
      </p>
    </div>
  );
}