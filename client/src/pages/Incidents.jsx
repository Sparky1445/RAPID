import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Filter, Shield, Clock, Phone, User, Calendar, Info, X,
  Video, Music, Image as ImageIcon, MapPin, Cpu, Download, List, AlertTriangle
} from 'lucide-react';
import { SkeletonBlock, SkeletonRow } from '../components/shared/Skeleton';

// A table-row-shaped skeleton, local to this file since this is the only table
// layout among the pages that needed one.
function SkeletonTableRow() {
  return (
    <tr>
      <td className="px-4 py-2.5"><SkeletonBlock className="h-4 w-40 mb-1.5" /><SkeletonBlock className="h-2.5 w-24" /></td>
      <td className="px-4 py-2.5"><SkeletonBlock className="h-3 w-16" /></td>
      <td className="px-4 py-2.5"><SkeletonBlock className="h-4 w-14 rounded-full" /></td>
      <td className="px-4 py-2.5"><SkeletonBlock className="h-3 w-24" /></td>
      <td className="px-4 py-2.5"><SkeletonBlock className="h-3 w-16" /></td>
      <td className="px-4 py-2.5 text-center"><SkeletonBlock className="h-6 w-24 mx-auto" /></td>
    </tr>
  );
}

function Incidents() {
  const [incidents, setIncidents] = useState([]);
  // Without this, "No incident logs found matches filters" showed during the
  // initial fetch too, indistinguishable from a genuinely empty registry.
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  // Inspection panel modal
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidentSnapshots, setIncidentSnapshots] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'media', 'snapshots', 'timeline', 'ai'
  // The dossier's Timeline Log tab has the same problem during
  // fetchDossierData(), so the modal gets its own flag.
  const [dossierLoading, setDossierLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    const fetchIncidents = async () => {
      try {
        const res = await fetch('/api/incidents');
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setIncidents(data);
        }
      } catch (err) {
        if (!ignore) console.error(err);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchIncidents();
    return () => { ignore = true; };
  }, []);

  // Fetch audit logs & snapshots when selecting an incident
  useEffect(() => {
    if (!selectedIncident) return;

    const fetchDossierData = async () => {
      setDossierLoading(true);
      try {
        const logRes = await fetch(`/api/incidents/${selectedIncident.id}/logs`);
        if (logRes.ok) {
          const logData = await logRes.json();
          setAuditLogs(logData);
        }

        const snapRes = await fetch(`/api/incidents/${selectedIncident.id}/snapshots`);
        if (snapRes.ok) {
          const snapData = await snapRes.json();
          setIncidentSnapshots(snapData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setDossierLoading(false);
      }
    };
    fetchDossierData();
  }, [selectedIncident]);

  const matchedIncidents = incidents.filter((inc) => {
    const matchesSearch = inc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (inc.citizen_name && inc.citizen_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          inc.id.includes(searchQuery);
    const matchesCategory = filterCategory === 'all' || inc.category === filterCategory;
    const matchesSeverity = filterSeverity === 'all' || inc.severity === filterSeverity;
    
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  // Severity order, not hue, decides what a dispatcher sees first. Reading a
  // colour correctly is not a precondition for triage (DIRECTION.md sec. 3).
  const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };
  const filteredIncidents = [...matchedIncidents].sort((a, b) => {
    const rank = (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
    if (rank !== 0) return rank;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Escape closes the dossier. It is a full-screen modal over a table; without
  // this a keyboard user has to tab to the close button to get out.
  useEffect(() => {
    if (!selectedIncident) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSelectedIncident(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIncident]);

  // Mock download of the entire evidence package zip file
  const handleDownloadEvidenceZip = () => {
    if (!selectedIncident) return;
    const link = document.createElement('a');
    link.href = 'https://file-examples.com/wp-content/uploads/2017/02/zip_2MB.zip'; // placeholder public zip
    link.setAttribute('download', `RAPID_EVIDENCE_CASE_${selectedIncident.id.slice(0, 8)}.zip`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="bg-accent/10 p-2.5 rounded-xl border border-accent/30">
          <FileText className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide text-text">Emergency Incident Registry</h2>
          <p className="text-xs text-muted font-mono mt-0.5">Audit log archive for drone dispatches, citizen alerts, and case resolutions.</p>
        </div>
      </div>

      {/* Filter controllers bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search by ID, title, caller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] bg-page text-text placeholder:text-muted border border-border-strong rounded-xl pl-10 pr-4 py-2 text-xs outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Filters Grid */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center justify-end">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="min-h-[44px] bg-page border border-border-strong text-xs rounded-xl px-3 py-2 text-text outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
            >
              <option value="all">All Categories</option>
              <option value="trespass">Trespass</option>
              <option value="fire">Fire Outbreaks</option>
              <option value="theft">Theft</option>
              <option value="assault">Assault</option>
              <option value="traffic">Traffic Collisions</option>
              <option value="medical">Medical Distress</option>
              <option value="other">Other</option>
            </select>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="min-h-[44px] bg-page border border-border-strong text-xs rounded-xl px-3 py-2 text-text outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent"
          >
            <option value="all">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Six columns will not fit a phone. The table scrolls sideways inside its
          own box rather than pushing the whole page wide; tabIndex makes that
          scroll reachable from the keyboard and not only by dragging. */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Incident register">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <caption className="sr-only">Emergency incidents, most severe first</caption>
            <thead>
              <tr className="bg-page border-b border-border font-mono text-muted uppercase tracking-wider">
                <th scope="col" className="px-4 py-2.5">Incident Details</th>
                <th scope="col" className="px-4 py-2.5">Category</th>
                <th scope="col" className="px-4 py-2.5">Priority</th>
                <th scope="col" className="px-4 py-2.5">Timestamp</th>
                <th scope="col" className="px-4 py-2.5">Status</th>
                <th scope="col" className="px-4 py-2.5 text-center">Evidence Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                [0, 1, 2, 3, 4].map(i => <SkeletonTableRow key={i} />)
              ) : filteredIncidents.map((inc) => {
                const tone = inc.severity === 'critical' ? 'critical'
                  : inc.severity === 'high' ? 'urgent'
                  : inc.severity === 'medium' ? 'warning' : 'normal';
                // Critical is filled and bold; everything else outline. Shape and
                // weight carry severity alongside hue.
                const fill = inc.severity === 'critical' ? 'status-badge--filled' : 'status-badge--outline';
  
                return (
                  <tr key={inc.id} className="hover:bg-page transition-all">
                    <td className="px-4 py-2.5">
                      <div className="font-bold text-text text-sm">{inc.title}</div>
                      <div className="text-[10px] text-muted font-mono mt-0.5 truncate max-w-[260px]">ID: {inc.id}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono uppercase text-muted">{inc.category}</td>
                    <td className="px-4 py-2.5">
                      <span className={`status-badge status-badge--${tone} ${fill} font-mono uppercase`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted">
                      {new Date(inc.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold">
                        <span
                          className={`status-dot ${
                            inc.status === 'resolved' ? 'status-dot--normal'
                              : inc.status === 'cancelled' ? '' : 'status-dot--urgent'
                          }`}
                          style={inc.status === 'cancelled' ? { background: 'var(--color-border-strong)' } : undefined}
                          aria-hidden="true"
                        />
                        <span className={
                          inc.status === 'resolved' ? 'text-status-normal'
                            : inc.status === 'cancelled' ? 'text-muted' : 'text-status-urgent'
                        }>{inc.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => { setSelectedIncident(inc); setActiveTab('overview'); }}
                        className="min-h-[44px] px-3 bg-page border border-border-strong text-text hover:border-accent rounded-lg transition-colors duration-150 flex items-center gap-1.5 mx-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                        title="Inspect Evidence Package"
                      >
                        <Info className="h-4 w-4 text-accent" />
                        <span className="text-[10px] font-mono text-text">Open Dossier</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
  
              {!loading && filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">
                    No incidents match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence dossier */}
      {selectedIncident && (
        <div
          className="fixed inset-0 bg-text/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedIncident(null); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dossier-title"
            className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-6 shadow-sm relative max-h-[90vh] flex flex-col"
          >
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" aria-hidden="true" />
                <div>
                  <h3 id="dossier-title" className="font-bold text-sm uppercase tracking-wider text-text">
                    Evidence dossier
                  </h3>
                  <p className="text-[9px] text-accent font-mono">Case {selectedIncident.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedIncident(null)}
                aria-label="Close dossier"
                className="h-11 w-11 flex items-center justify-center rounded-lg text-muted hover:text-text transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* TAB SELECTORS */}
            <nav className="flex border-b border-border mb-4 text-xs font-mono text-muted select-none">
              {[
                { id: 'overview', label: 'Summary', icon: FileText },
                { id: 'media', label: 'Video/Audio', icon: Video },
                { id: 'snapshots', label: `Snapshots (${incidentSnapshots.length})`, icon: ImageIcon },
                { id: 'timeline', label: 'Timeline log', icon: List },
                { id: 'ai', label: 'AI Advice', icon: Cpu }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-4 min-h-[44px] border-b-2 font-bold uppercase transition-colors duration-150 -mb-[2px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                      activeTab === t.id 
                        ? 'border-accent text-accent' 
                        : 'border-transparent hover:text-text'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
              
              {/* Tab: Overview Dossier */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="bg-page/60 p-4 border border-border rounded-2xl">
                    <h4 className="font-bold text-text text-base mb-1">{selectedIncident.title}</h4>
                    <p className="text-xs text-muted leading-relaxed">{selectedIncident.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-page p-4 border border-border rounded-2xl space-y-2">
                      <span className="text-[10px] font-mono text-accent uppercase tracking-wider block font-bold mb-1.5">
                        Citizen Alert Details
                      </span>
                      <div className="space-y-1 text-xs text-muted font-mono">
                        <p className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 text-muted" /> Date: <span className="text-text">{new Date(selectedIncident.created_at).toLocaleDateString()}</span></p>
                        <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted" /> Ingestion Time: <span className="text-text">{new Date(selectedIncident.created_at).toLocaleTimeString()}</span></p>
                        <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-muted" /> Reporter: <span className="text-text">{selectedIncident.citizen_name || 'N/A'}</span></p>
                        <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted" /> Contact Number: <span className="text-text">{selectedIncident.citizen_phone || 'N/A'}</span></p>
                      </div>
                    </div>

                    <div className="bg-page p-4 border border-border rounded-2xl space-y-2">
                      <span className="text-[10px] font-mono text-accent uppercase tracking-wider block font-bold mb-1.5">
                        Telemetry coordinates
                      </span>
                      <div className="space-y-1 text-xs text-muted font-mono">
                        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted" /> Incident Lat: <span className="text-text">{selectedIncident.latitude.toFixed(6)}</span></p>
                        <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted" /> Incident Lng: <span className="text-text">{selectedIncident.longitude.toFixed(6)}</span></p>
                        <p className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-muted" /> Resolution: <span className="text-status-normal font-bold uppercase">{selectedIncident.status}</span></p>
                        <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted" /> Finalized Time: <span className="text-text">{selectedIncident.resolved_at ? new Date(selectedIncident.resolved_at).toLocaleTimeString() : 'Awaiting controller'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Video & Audio Recordings */}
              {activeTab === 'media' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Mission Video */}
                    <div className="space-y-2 bg-page p-3 rounded-2xl border border-border">
                      <span className="text-[9px] font-mono text-accent uppercase tracking-wider font-bold block mb-1">
                        📹 Drone Camera Footage (HEVC H.265)
                      </span>
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative flex items-center justify-center">
                        <video 
                          src="https://www.w3.org/2010/05/video/media/movie_300.mp4" 
                          controls 
                          className="w-full h-full object-cover filter contrast-1.1 sepia(0.1) saturate(1.1) brightness(0.95)"
                        />
                      </div>
                      <div className="text-[9px] font-mono text-muted flex justify-between">
                        <span>FPS: 30 | BITRATE: 6.2Mbps</span>
                        <span className="text-status-normal font-bold">DIGITAL WATERMARK VALID</span>
                      </div>
                    </div>

                    {/* Mission Audio */}
                    <div className="space-y-2 bg-page p-3 rounded-2xl border border-border flex flex-col">
                      <span className="text-[9px] font-mono text-accent uppercase tracking-wider font-bold block mb-1">
                        🎙️ Cockpit Voice Transmission
                      </span>
                      <div className="flex-1 flex flex-col justify-center items-center py-6 bg-black rounded-xl">
                        
                        {/* Audio visual mock waveform */}
                        <div className="flex items-end justify-center gap-1 h-12 mb-4">
                          {[30, 80, 50, 90, 40, 70, 20, 60, 80, 40, 90, 50, 70, 30].map((h, i) => (
                            <div 
                              key={i} 
                              style={{ height: `${h}%` }} 
                              className="w-1.5 bg-accent rounded-full opacity-60"
                            ></div>
                          ))}
                        </div>

                        <audio 
                          src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" 
                          controls
                          className="w-full max-w-[200px] h-8 scale-90"
                        />
                      </div>
                      <div className="text-[9px] font-mono text-muted flex justify-between">
                        <span>FORMAT: 64kbps Opus Mono</span>
                        <span className="text-status-normal font-bold">TRANSCRIPT ARCHIVED</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab: Evidence Snapshots */}
              {activeTab === 'snapshots' && (
                <div className="space-y-4">
                  {dossierLoading ? (
                    <div className="grid grid-cols-2 gap-4">
                      <SkeletonBlock className="h-40 w-full" />
                      <SkeletonBlock className="h-40 w-full" />
                    </div>
                  ) : incidentSnapshots.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {incidentSnapshots.map((snap) => (
                        <div 
                          key={snap.id} 
                          className="bg-page border border-border rounded-2xl overflow-hidden flex flex-col"
                        >
                          <div className="aspect-video w-full overflow-hidden bg-black relative">
                            {/* This grid holds up to 200 snapshots inside a
                                scrollable modal, so the images load lazily. */}
                            <img
                              src={snap.image_url}
                              loading="lazy"
                              className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-all"
                              alt={snap.label} 
                            />
                            <div className="absolute top-2 left-2 bg-text/70 border border-accent/30 px-2 py-0.5 rounded text-[8px] font-mono text-accent font-bold uppercase">
                              AI: {snap.label}
                            </div>
                          </div>
                          
                          <div className="p-3 text-[10px] font-mono text-muted space-y-1 border-t border-border">
                            <div className="flex justify-between"><span>Timestamp:</span><span className="text-text">{new Date(snap.timestamp).toLocaleTimeString()}</span></div>
                            <div className="flex justify-between"><span>GPS Coordinate:</span><span className="text-accent font-bold">{snap.latitude.toFixed(5)}, {snap.longitude.toFixed(5)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted italic flex flex-col items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-accent mb-2 opacity-50" />
                      <p className="text-xs font-mono">No AI snapshots saved for this case ID.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Timeline log */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {dossierLoading ? (
                      [0, 1, 2].map(i => <SkeletonRow key={i} />)
                    ) : auditLogs.map((log) => (
                      <div key={log.id} className="relative pl-5 border-l border-accent/20 py-1">
                        <div className="absolute -left-[4px] top-2.5 h-2 w-2 bg-accent rounded-full"></div>
                        <div className="flex justify-between items-center text-[10px] font-mono text-muted">
                          <span className="text-accent font-bold uppercase tracking-wider">
                            {log.action.replace(/_/g, ' ')}
                          </span>
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-text mt-1 font-sans leading-relaxed">{log.notes}</p>
                      </div>
                    ))}

                    {!dossierLoading && auditLogs.length === 0 && (
                      <p className="text-xs text-muted italic py-6 text-center">No timeline records found.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: AI Recommendations & Advice Dossier */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  <div className="bg-page/60 p-4 border border-border rounded-2xl flex gap-3">
                    <Cpu className="h-6 w-6 text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-mono text-xs text-accent font-bold uppercase tracking-wider mb-2">
                        AI Target Profiling & Flight Assessment
                      </h4>
                      <p className="text-xs text-text leading-relaxed font-mono">
                        Flight assessment parameters completed with nominal energy efficiency index (74.2% operational ratio). 
                        No-fly boundaries respected during all flight segments. 
                        Target classification confidence factors:
                        <br />
                        - Human tracking target detection: 94.2% accuracy.
                        <br />
                        - Fire hazard detection classification: 98.7% accuracy.
                      </p>
                    </div>
                  </div>

                  <div className="bg-page p-4 border border-border rounded-2xl space-y-2 text-xs font-mono">
                    <span className="text-[10px] font-mono text-status-critical uppercase tracking-wider block font-bold mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-status-critical" aria-hidden="true" /> Command Advice & Actions Dossier
                    </span>
                    <p className="text-text leading-relaxed">
                      Incident logs suggest suspect fled to nearby Candolim secondary intersections. 
                      Recommend dispatching sector 4 ground vehicles to set perimeter barriers. 
                      UAV camera feed recording package compiled successfully and marked for police evidence submission.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer / Download Button */}
            <div className="mt-6 border-t border-border pt-4 flex justify-between items-center">
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest">
                RAPID EVIDENCE PROTECTION COMPLIANT
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 border border-border-strong hover:text-text rounded-xl text-xs font-mono text-muted transition-all"
                >
                  Close Dossier
                </button>
                <button
                  onClick={handleDownloadEvidenceZip}
                  className="min-h-[44px] px-5 bg-accent text-on-solid font-medium rounded-xl text-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-150 hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Evidence Package
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Incidents;
