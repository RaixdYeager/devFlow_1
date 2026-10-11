import { Navigate, Outlet } from "react-router-dom";

function PublicRoute() {
  const accessToken = localStorage.getItem("access_token");

  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PublicRoute;