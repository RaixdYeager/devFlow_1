
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
import Notifications from "./pages/Notifications";
import Activity from "./pages/Activity";

function App() {
  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Public authentication routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Route>

      {/* Protected application routes */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/projects/:id" element={<ProjectDetail />} />

        <Route
          path="/projects/:id/board"
          element={<KanbanBoard />}
        />

        <Route
          path="/projects/:id/tasks/:taskId"
          element={<TaskDetail />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/activity"
          element={<Activity />}
        />
      </Route>
    </Routes>
  );
}

export default App;
