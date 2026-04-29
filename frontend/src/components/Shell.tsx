import { NavLink } from "react-router-dom";
import { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/upload", label: "Upload" },
  { to: "/analysis", label: "Analysis" },
  { to: "/assistant", label: "Assistant" },
  { to: "/issues", label: "Issues" }
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen text-[#f4efe2]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-7">
        <header className="rounded-[2.25rem] border border-[#aa8502]/25 bg-[#1a1a1a]/92 p-6 shadow-panel backdrop-blur md:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-[#aa8502]">Timetable Advisory</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">AI Timetable System</h1>
            </div>
            <div className="rounded-full border border-[#aa8502]/30 bg-[#aa8502]/12 px-4 py-2 text-sm text-[#f3d67d]">
              Live
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-[#aa8502] text-[#161616]"
                      : "border border-[#4d4d4d] bg-[#202020] text-[#d4d4d4] hover:border-[#aa8502]/40 hover:bg-[#282828]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
