import { useEffect, useState } from "react";
import AdminApp from "./components/AdminApp";
import ParticipantApp from "./components/ParticipantApp";
import PresentationView from "./components/PresentationView";
import PublicGroupsView from "./components/PublicGroupsView";
import { GradientHero, ROAILogo } from "./ui";
import { initFirebase } from "./firebase";

function Home() {
  return (
    <div className="min-h-screen bg-[#F7F5FB]">
      <GradientHero>
        <div className="flex justify-center mb-6">
          <ROAILogo dark size="lg" />
        </div>
        <h1 className="text-4xl font-black text-white">Future of Work Action Workshop</h1>
      </GradientHero>
      <div className="max-w-lg mx-auto text-center px-6 py-10">
        <p className="text-gray-500">
          This is the workshop facilitation tool. Facilitators should go to{" "}
          <a href="/admin" className="text-[#FF6B4A] font-bold underline">
            /admin
          </a>
          . Assigned facilitators use their workshop link to work on their group's activities; everyone else can
          follow along on the public groups link, shared by the admin.
        </p>
      </div>
    </div>
  );
}

function extractId(path: string, prefix: string): string {
  return path.replace(prefix, "").split(/[/?#]/)[0];
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
      <div className="min-h-screen bg-[#F7F5FB] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (path === "/admin") return <AdminApp />;
  if (path.startsWith("/w/")) return <ParticipantApp workshopId={extractId(path, "/w/")} />;
  if (path.startsWith("/groups/")) return <PublicGroupsView workshopId={extractId(path, "/groups/")} />;
  if (path.startsWith("/present/")) return <PresentationView workshopId={extractId(path, "/present/")} />;
  return <Home />;
}
