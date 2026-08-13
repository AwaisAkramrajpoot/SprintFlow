import { Navigate, useLocation } from "react-router-dom";

import { USE_MOCK_API, getAccessToken, getRefreshToken } from "../api/client";
import useTaskFlow from "../hooks/useTaskFlow";

function RequireAuth({ children }) {
  const { isAuthenticated } = useTaskFlow();
  const location = useLocation();
  const hasToken = Boolean(getAccessToken() || getRefreshToken());

  // Mock mode needs a local session. API mode allows token bootstrap before hydrate.
  const allowed = USE_MOCK_API ? isAuthenticated : isAuthenticated || hasToken;

  if (!allowed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default RequireAuth;
