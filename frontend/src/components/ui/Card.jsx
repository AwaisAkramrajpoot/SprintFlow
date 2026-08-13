function Card({ children, className = "", interactive = false }) {
  return (
    <section
      className={[
        "tf-surface p-5 md:p-6",
        interactive ? "tf-hover-lift cursor-pointer" : "",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

export default Card;
