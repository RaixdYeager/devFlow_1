import { Routes, Route } from "react-router-dom";
import "./App.css";

import LandingPage from "./components/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ProjectDetail from "./pages/ProjectDetail";
import KanbanBoard from "./pages/KanbanBoard";
import TaskDetail from "./pages/TaskDetail";

function App() {
  return (
    <Routes>
      {/* =========================
          LANDING PAGE
      ========================= */}

      <Route
        path="/"
        element={<LandingPage />}
      />

      {/* =========================
          PUBLIC AUTH ROUTES
      ========================= */}

      <Route element={<PublicRoute />}>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />
      </Route>

      {/* =========================
          PROTECTED ROUTES
      ========================= */}

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/projects/:id"
          element={<ProjectDetail />}
        />

        <Route
          path="/projects/:id/board"
          element={<KanbanBoard />}
        />

        <Route
          path="/projects/:id/tasks/:taskId"
          element={<TaskDetail />}
        />
      </Route>
    </Routes>
  );
}

export default App;