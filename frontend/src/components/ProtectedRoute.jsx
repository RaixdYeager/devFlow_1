import { Navigate, Outlet } from "react-router-dom";

function isTokenValid(token) {
  try {
    const payload = JSON.parse(
      atob(token.split(".")[1])
    );

    if (!payload.exp) {
      return false;
    }

    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function ProtectedRoute() {
  const accessToken = localStorage.getItem("access_token");

  if (!accessToken || !isTokenValid(accessToken)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;