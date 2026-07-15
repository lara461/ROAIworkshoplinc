import { useEffect, useState } from "react";
import AdminApp from "./components/AdminApp";
import ParticipantApp from "./components/ParticipantApp";
import PresentationView from "./components/PresentationView";

function Home() {
  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100 flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-4">
        <div className="text-sm uppercase tracking-[0.3em] text-sky-400">ROAI Institute</div>
        <h1 className="text-3xl font-semibold">Future of Work Action Workshop</h1>
        <p className="text-slate-400">
          This is the workshop facilitation tool. Facilitators should go to{" "}
          <a href="/admin" className="text-sky-400 underline">
            /admin
          </a>
          . Participants should use the unique link sent to them by email.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path === "/admin") return <AdminApp />;
  if (path.startsWith("/w/")) return <ParticipantApp token={path.replace("/w/", "")} />;
  if (path.startsWith("/present/")) return <PresentationView workshopId={path.replace("/present/", "")} />;
  return <Home />;
}
