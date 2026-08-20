const badgeStyles = {
  success:
    "bg-[#e6f6ee] text-[#147a4c] border-[#b7e4cb]",
  warning:
    "bg-[#fff4df] text-[#9a6a0a] border-[#f0d59a]",
  danger:
    "bg-[#fdeceb] text-[#b42318] border-[#f3c1bc]",
  muted: "bg-[#e8eee9] text-[#24352c] border-[#c9d5cd]",
  sky: "bg-[#e4f5ee] text-[#0c7d5c] border-[#b4dfcc]",
};

function Badge({ children, tone = "muted", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[0.72rem] font-bold tracking-[0.03em]",
        badgeStyles[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default Badge;
