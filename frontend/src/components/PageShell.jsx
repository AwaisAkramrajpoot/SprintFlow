import { useLocation } from "react-router-dom";

function PageShell({ children, className = "" }) {
  const location = useLocation();

  return (
    <div
      key={location.pathname}
      className={["tf-page space-y-7", className].join(" ")}
    >
      {children}
    </div>
  );
}

export default PageShell;
