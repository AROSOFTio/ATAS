import { ReactNode } from "react";

export function Panel({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#4d4d4d] bg-[#1a1a1a] p-6 shadow-panel backdrop-blur md:p-7">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight text-white md:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-[#b9b9b9]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
