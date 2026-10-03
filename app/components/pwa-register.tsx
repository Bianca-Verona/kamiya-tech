"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      console.log("Kamiya Tech PWA: Service Worker não é suportado.");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "Kamiya Tech PWA: Service Worker registrado com sucesso.",
          registration.scope
        );
      })
      .catch((error) => {
        console.error(
          "Kamiya Tech PWA: erro ao registrar Service Worker.",
          error
        );
      });
  }, []);

  return null;
}