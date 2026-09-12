import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./features/auth/LoginPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";
import { PublicOnlyRoute } from "./features/auth/PublicOnlyRoute";
import { RegisterPage } from "./features/auth/RegisterPage";
import { AiUploadPage } from "./features/aiUpload/AiUploadPage";
import { ChatPage } from "./features/chat/ChatPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { GoalsPage } from "./features/goals/GoalsPage";
import { MealsPage } from "./features/meals/MealsPage";
import { PdfImportPage } from "./features/pdfImport/PdfImportPage";
import { ReportsPage } from "./features/reports/ReportsPage";

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/meals" element={<MealsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/ai-upload" element={<AiUploadPage />} />
          <Route path="/assistant" element={<ChatPage />} />
          <Route path="/pdf-import" element={<PdfImportPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
