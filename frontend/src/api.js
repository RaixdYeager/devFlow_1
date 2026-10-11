
const API_BASE_URL = "http://127.0.0.1:8000/api";

const API_ORIGIN = "http://127.0.0.1:8000";

// Convert relative API paths into absolute Django URLs.
const buildApiUrl = (url) => {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${API_ORIGIN}${url.startsWith("/") ? url : `/${url}`}`;
};

export const apiFetch = async (url, options = {}) => {
  let accessToken = localStorage.getItem("access_token");

  const makeRequest = async (token) => {
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    return fetch(buildApiUrl(url), {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(accessToken);

  // Refresh an expired access token.
  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token");

    if (!refreshToken) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return response;
    }

    let refreshResponse;

    try {
      refreshResponse = await fetch(
        `${API_BASE_URL}/accounts/token/refresh/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refresh: refreshToken,
          }),
        }
      );
    } catch {
      throw new Error("Unable to reach the authentication server.");
    }

    if (!refreshResponse.ok) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return response;
    }

    const refreshData = await refreshResponse.json();

    if (!refreshData.access) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/login";
      return response;
    }

    localStorage.setItem("access_token", refreshData.access);

    accessToken = refreshData.access;

    // Retry the original request with the new token.
    response = await makeRequest(accessToken);
  }

  return response;
};

export default apiFetch;
