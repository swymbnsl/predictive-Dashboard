import React, { useEffect, useState } from "react";
import "../styles/globals.css";

const navLinks = [
  { href: "#upload", label: "🗂 Upload & Report" },
  { href: "#summary", label: "📄 Summary" },
  { href: "#trend", label: "📈 Trend" },
  { href: "#scheduler", label: "🛠 Scheduler" },
  { href: "#heatmap", label: "🔥 Heatmap" },
  { href: "#simulator", label: "🔮 Simulator" },
];

const Navbar = () => {
  const [active, setActive] = useState(window.location.hash || "#upload");

  useEffect(() => {
    const onHashChange = () => setActive(window.location.hash || "#upload");
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return (
    <nav className="navbar">
      <div className="logo">🛠 Predictive Maintenance</div>
      <ul>
        {navLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={active === link.href ? "active" : ""}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;