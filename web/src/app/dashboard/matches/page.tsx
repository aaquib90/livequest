"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UpgradeHighlights } from "@/components/ui/upgrade-highlights";

type Match = {
  id: number;
  league_id: number;
  league_name: string;
  country: string;
  season: number;
  date: string;
  status: string;
  venue: string | null;
  home_team_name: string;
  away_team_name: string;
  home_goals: number | null;
  away_goals: number | null;
};

const upgradeHighlights = [
  "Unlimited liveblogs every month",
  "Sponsor slots with impressions and CTR tracking",
  "Account-wide analytics exports and editor invites",
] as const;

export default function MatchesPage() {
  const [country, setCountry] = useState<string>("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [data, setData] = useState<Match[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [view, setView] = useState<"table" | "calendar">("table");
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState(
    "You've hit the free plan ceiling. Pro unlocks unlimited coverage, richer sponsor tooling, and exports your editors will love.",
  );

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (leagueId) params.set("league_id", leagueId);
    if (status) params.set("status", status);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [country, leagueId, status, from, to]);

  async function fetchMatches() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches?${qs}`, { cache: "no-store" });
      const json = await res.json();
      setData(json.data ?? []);
    } catch (err) {
      console.error(err);
      setError("We couldn't load fixtures right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6 p-6">
      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="max-w-xl overflow-hidden border border-border/60 bg-background/95 p-0 sm:max-w-2xl">
          <div className="relative space-y-6 p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(161,161,170,0.08),_transparent_45%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.14),_transparent_55%)]" />
            <div className="relative space-y-6">
              <DialogHeader className="space-y-3 text-left">
                <DialogTitle className="text-3xl font-semibold tracking-tight text-foreground sm:text-[34px]">
                  Go Pro, stay live all season
                </DialogTitle>
                <DialogDescription className="text-base leading-relaxed text-muted-foreground">
                  {limitMessage}
                </DialogDescription>
              </DialogHeader>
              <UpgradeHighlights items={upgradeHighlights} />
              <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-primary/10 p-5 text-sm text-primary-foreground/90 shadow-[0_20px_70px_-45px_rgba(79,70,229,0.9)]">
                <div className="pointer-events-none absolute -top-24 right-0 h-44 w-44 rounded-full bg-primary/40 blur-3xl" />
                <div className="relative">
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Pro plan</p>
                  <p className="mt-2 text-lg font-semibold text-primary-foreground">
                    $3.99 / month · cancel anytime
                  </p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    Includes shared editor access, webhooks, and sponsor exports on top of unlimited liveblogs.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 border-t border-border/70 bg-background/80 px-6 py-4 sm:flex-row sm:justify-between sm:px-8">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setLimitDialogOpen(false)}
            >
              Not now
            </Button>
            <Button
              asChild
              size="lg"
              className="group relative overflow-hidden rounded-full px-7 text-base font-semibold shadow-[0_18px_65px_-30px_rgba(94,234,212,0.9)] transition-all hover:shadow-[0_24px_80px_-30px_rgba(94,234,212,0.9)]"
            >
              <Link href="/account?focus=billing">
                Upgrade plan
                <span className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-500 opacity-90 transition group-hover:opacity-100" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input
            placeholder="Country (e.g. England)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            placeholder="League ID (e.g. 39)"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Status</option>
            <option value="NS">Scheduled</option>
            <option value="LIVE">Live</option>
            <option value="HT">HT</option>
            <option value="FT">Finished</option>
          </Select>
        </div>
        <div className="w-40">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-40">
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button onClick={fetchMatches} disabled={loading}>
          {loading ? "Loading…" : "Apply Filters"}
        </Button>
        <Button variant="secondary" onClick={() => setView(view === "table" ? "calendar" : "table")}>
          {view === "table" ? "Calendar View" : "Table View"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      ) : null}

      {view === "table" ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Date</th>
                <th className="p-2">Competition</th>
                <th className="p-2">Country</th>
                <th className="p-2">Match</th>
                <th className="p-2">Status</th>
                <th className="p-2">Score</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{new Date(m.date).toLocaleString()}</td>
                  <td className="p-2">{m.league_name}</td>
                  <td className="p-2">{m.country}</td>
                  <td className="p-2">{m.home_team_name} vs {m.away_team_name}</td>
                  <td className="p-2">{m.status}</td>
                  <td className="p-2">{m.home_goals ?? "-"} : {m.away_goals ?? "-"}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setCreatingId(m.id);
                        setError(null);
                        try {
                          const res = await fetch("/api/liveblogs/from-fixture", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ matchId: m.id }),
                          });
                          const json = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            if (json?.code === "limit_reached") {
                              setLimitMessage(
                                json?.error ||
                                  "You've reached the liveblog limit on your current plan. Upgrade for unlimited coverage.",
                              );
                              setLimitDialogOpen(true);
                            } else {
                              setError(json?.error || "Failed to create liveblog. Please try again.");
                            }
                            return;
                          }
                          if (json?.id) {
                            window.location.href = `/liveblogs/${json.id}/manage`;
                          } else {
                            setError(
                              "Liveblog created, but we couldn't redirect you automatically. Refresh your dashboard to continue.",
                            );
                          }
                        } catch (err) {
                          console.error(err);
                          setError("Something went wrong while creating the liveblog. Please try again.");
                        } finally {
                          setCreatingId(null);
                        }
                      }}
                      disabled={creatingId === m.id}
                    >
                      {creatingId === m.id ? "Creating…" : "Create liveblog"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <CalendarView matches={data} />
      )}
    </div>
  );
}

function CalendarView({ matches }: { matches: Match[] }) {
  // Lightweight calendar substitute: group by date
  const byDate = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const day = new Date(m.date).toISOString().slice(0, 10);
      const list = map.get(day) || [];
      list.push(m);
      map.set(day, list);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  return (
    <div className="space-y-4">
      {byDate.map(([day, list]) => (
        <div key={day} className="rounded-md border">
          <div className="bg-muted px-3 py-2 font-medium">{day}</div>
          <ul className="divide-y">
            {list.map((m) => (
              <li key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm">
                    {new Date(m.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="font-medium">
                    {m.home_team_name} vs {m.away_team_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.league_name} • {m.country}
                  </div>
                </div>
                <div className="text-sm">
                  {m.status}
                  {m.home_goals != null && m.away_goals != null ? ` • ${m.home_goals}:${m.away_goals}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
