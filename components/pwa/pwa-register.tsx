"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[v0] Service Worker registered:", registration.scope)

          registration.addEventListener("updatefound", () => {
            console.log("[v0] Service Worker update found")
          })
        })
        .catch((error) => {
          console.error("[v0] Service Worker registration failed:", error)
        })
    } else {
      console.log("[v0] Service Workers not supported")
    }
  }, [])

  return null
}
