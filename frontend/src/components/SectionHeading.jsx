function SectionHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? <p className="tf-eyebrow">{eyebrow}</p> : null}
        <h2 className="tf-title mt-3 text-[2rem] md:text-[2.35rem]">{title}</h2>
        {description ? (
          <p className="mt-3 text-[0.98rem] leading-relaxed text-[var(--tf-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

export default SectionHeading;
