import { useEffect, useState } from "react";
import AdminApp from "./components/AdminApp";
import ParticipantApp from "./components/ParticipantApp";
import PresentationView from "./components/PresentationView";
import { ROAILogo } from "./ui";
import { initFirebase } from "./firebase";

function Home() {
  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center px-6">
      <div className="max-w-lg text-center space-y-6">
        <div className="flex justify-center">
          <ROAILogo size="lg" />
        </div>
        <h1 className="text-3xl font-black text-[#0A0E2A]">Future of Work Action Workshop</h1>
        <p className="text-gray-500">
          This is the workshop facilitation tool. Facilitators should go to{" "}
          <a href="/admin" className="text-[#E8503A] font-bold underline">
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initFirebase().then(() => setReady(true));
  }, []);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (path === "/admin") return <AdminApp />;
  if (path.startsWith("/w/")) return <ParticipantApp workshopId={path.replace("/w/", "")} />;
  if (path.startsWith("/present/")) return <PresentationView workshopId={path.replace("/present/", "")} />;
  return <Home />;
}
