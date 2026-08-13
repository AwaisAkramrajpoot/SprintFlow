import { useLocation } from "react-router-dom";

function PageShell({ children, className = "", noAnimation = false }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={[noAnimation ? "" : "tf-page", "space-y-7", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export default PageShell;
