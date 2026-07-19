import { useEffect, useState } from "react";
import AdminApp from "./components/AdminApp";
import ParticipantApp from "./components/ParticipantApp";
import PresentationView from "./components/PresentationView";
import PublicGroupsView from "./components/PublicGroupsView";
import { PageHeader, ROAILogo } from "./ui";
import { initFirebase } from "./firebase";

function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-6">
        <ROAILogo size="md" />
        <PageHeader
          title="Future of Work Action Workshop"
          subtitle="Assigned facilitators use their workshop link to work on their group's activities; everyone else follows along on the public groups link, shared by the admin."
        />
        <a
          href="/admin"
          className="inline-flex items-center gap-2 bg-[#14121F] text-white font-semibold text-sm rounded-lg px-4 py-2 hover:bg-[#262238] transition-colors"
        >
          Go to admin
        </a>
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
      <div className="min-h-screen bg-white flex items-center justify-center">
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
