import { Navigate, useLocation } from "react-router-dom";

import useTaskFlow from "../hooks/useTaskFlow";

function RequireAuth({ children }) {
  const { isAuthenticated } = useTaskFlow();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default RequireAuth;
