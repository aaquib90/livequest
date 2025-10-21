"use client";

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

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

export default function MatchesPage() {
  const [country, setCountry] = useState<string>("");
  const [leagueId, setLeagueId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [data, setData] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [view, setView] = useState<'table' | 'calendar'>('table');

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (country) params.set('country', country);
    if (leagueId) params.set('league_id', leagueId);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return params.toString();
  }, [country, leagueId, status, from, to]);

  async function fetchMatches() {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches?${qs}`, { cache: 'no-store' });
      const json = await res.json();
      setData(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <Input placeholder="Country (e.g. England)" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="w-40">
          <Input placeholder="League ID (e.g. 39)" value={leagueId} onChange={(e) => setLeagueId(e.target.value)} />
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
        <Button onClick={fetchMatches} disabled={loading}>{loading ? 'Loading…' : 'Apply Filters'}</Button>
        <Button variant="secondary" onClick={() => setView(view === 'table' ? 'calendar' : 'table')}>
          {view === 'table' ? 'Calendar View' : 'Table View'}
        </Button>
      </div>

      {view === 'table' ? (
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
                  <td className="p-2">{m.home_goals ?? '-'} : {m.away_goals ?? '-'}</td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setCreatingId(m.id);
                        const res = await fetch('/api/liveblogs/from-fixture', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ matchId: m.id }),
                        });
                        const json = await res.json();
                        if (json?.id) {
                          window.location.href = `/liveblogs/${json.id}/manage`;
                        } else {
                          alert(json?.error || 'Failed to create');
                          setCreatingId(null);
                        }
                      }}
                    >
                      {creatingId === m.id ? 'Creating…' : 'Create liveblog'}
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
        <div key={day} className="border rounded-md">
          <div className="px-3 py-2 font-medium bg-gray-50">{day}</div>
          <ul className="divide-y">
            {list.map((m) => (
              <li key={m.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm">{new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="font-medium">{m.home_team_name} vs {m.away_team_name}</div>
                  <div className="text-xs text-gray-500">{m.league_name} • {m.country}</div>
                </div>
                <div className="text-sm">{m.status}{m.home_goals != null && m.away_goals != null ? ` • ${m.home_goals}:${m.away_goals}` : ''}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}


