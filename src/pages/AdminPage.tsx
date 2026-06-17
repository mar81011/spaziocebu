import { Route, Routes } from "react-router-dom";
import { AdminGate } from "../components/admin/AdminGate";
import { AdminLayout } from "../components/admin/AdminLayout";
import { MenuPanel } from "../components/admin/MenuPanel";
import { OrdersPanel } from "../components/admin/OrdersPanel";
import { TransactionsPanel } from "../components/admin/TransactionsPanel";

export function AdminPage() {
  return (
    <AdminGate>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<OrdersPanel />} />
          <Route path="menu" element={<MenuPanel />} />
          <Route path="transactions" element={<TransactionsPanel />} />
        </Route>
      </Routes>
    </AdminGate>
  );
}
