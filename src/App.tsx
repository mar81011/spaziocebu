import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { bootstrapStorage, isDatabaseEnabled } from "./lib/storage";

export default function App() {
  const [ready, setReady] = useState(!isDatabaseEnabled());

  useEffect(() => {
    void bootstrapStorage().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream text-espresso">
        <p className="font-serif text-xl">Loading Spazio…</p>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin/*" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}