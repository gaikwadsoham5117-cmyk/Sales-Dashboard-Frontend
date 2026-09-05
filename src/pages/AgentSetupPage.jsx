import React, { useState, useEffect } from 'react';
import {
  getMyAgentsApi,
  createAgentApi,
  downloadAgentSeparateFiles,
  setupAgentOnThisPc,
  supportsDirectPcSetup,
} from '../api/agentApi';
import { Download, Server, Wifi, WifiOff, PlusCircle, RefreshCw, ShieldAlert, Info, FolderCheck, CheckCircle2 } from 'lucide-react';

function StatusBadge({ status }) {
  const isOnline = status === 'ONLINE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
        isOnline
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-slate-700/40 text-slate-400 border-slate-600/50'
      }`}
    >
      {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isOnline ? 'Online' : 'Offline'}
    </span>
  );
}

function formatTimestamp(value) {
  if (!value) return 'Never';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AgentSetupPage() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [agentName, setAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [downloadingId, setDownloadingId] = useState('');

  const [settingUpId, setSettingUpId] = useState('');
  const [setupProgress, setSetupProgress] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');

  const canSetupDirectly = supportsDirectPcSetup();

  const loadAgents = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await getMyAgentsApi();
      setAgents(list || []);
    } catch (err) {
      setError(err.message || 'Unable to load agents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleDownload = async (agentId) => {
    setDownloadingId(agentId);
    setError('');
    try {
      await downloadAgentSeparateFiles(agentId);
    } catch (err) {
      setError(err.message || 'Download failed.');
    } finally {
      setDownloadingId('');
    }
  };

  const handleSetupOnThisPc = async (agentId) => {
    setSettingUpId(agentId);
    setSetupSuccess('');
    setError('');
    try {
      const folderName = await setupAgentOnThisPc(agentId, setSetupProgress);
      setSetupSuccess(
        `Saved to "${folderName}". Open that folder and double-click tally-agent.jar (or run java -jar tally-agent.jar) to start it.`
      );
    } catch (err) {
      // The user clicking "Cancel" in the folder picker throws an
      // AbortError - that's not a real error, just don't show anything.
      if (err.name !== 'AbortError') {
        setError(err.message || 'Setup failed.');
      }
    } finally {
      setSettingUpId('');
      setSetupProgress('');
    }
  };

  const handleCreateAndDownload = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setSetupSuccess('');
    try {
      const newAgent = await createAgentApi(agentName.trim() || 'Tally Agent');
      setAgentName('');
      await loadAgents();
      // Prefer writing straight to a folder the user picks when the
      // browser supports it; otherwise fall back to a plain zip download.
      if (canSetupDirectly) {
        await handleSetupOnThisPc(newAgent.agentId);
      } else {
        await handleDownload(newAgent.agentId);
      }
    } catch (err) {
      setError(err.message || 'Unable to create agent.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl space-y-1">
        <h2 className="text-xl lg:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" />
          Tally Agent Setup
        </h2>
        <p className="text-xs text-slate-400">
          The agent runs on the same PC as TallyPrime and relays your sales data to this dashboard.
          Create one below and download it to get connected.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 shadow-lg">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {setupSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="font-semibold">{setupSuccess}</span>
        </div>
      )}

      {/* Create new agent */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-indigo-400" />
          Set Up a New Agent
        </h3>
        <form onSubmit={handleCreateAndDownload} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Agent name (e.g. Office PC)"
            className="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors font-medium"
          />
          <button
            type="submit"
            disabled={creating}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {canSetupDirectly ? (
              <FolderCheck className={`w-3.5 h-3.5 ${creating ? 'animate-bounce' : ''}`} />
            ) : (
              <Download className={`w-3.5 h-3.5 ${creating ? 'animate-bounce' : ''}`} />
            )}
            <span>
              {creating
                ? (setupProgress || 'Setting up...')
                : canSetupDirectly
                ? 'Create & Set Up Agent'
                : 'Create & Download Agent'}
            </span>
          </button>
        </form>
        <p className="text-[11px] text-slate-500 mt-2 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          {canSetupDirectly
            ? "You'll be asked to pick or create a folder (e.g. a new \"TallyAgent\" folder) - everything gets written straight into it, ready to run."
            : 'This downloads a zip with everything pre-configured for your account. Unzip it and run the launcher inside the bin folder.'}
        </p>
      </div>

      {/* Existing agents */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">Your Agents</h3>
          <button
            onClick={loadAgents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : agents.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">
            No agents yet. Create one above to connect TallyPrime to your dashboard.
          </p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.agentId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-100 truncate">{agent.agentName}</span>
                    <StatusBadge status={agent.status} />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono truncate">{agent.agentId}</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Last seen: {formatTimestamp(agent.lastSeen)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canSetupDirectly && (
                    <button
                      onClick={() => handleSetupOnThisPc(agent.agentId)}
                      disabled={settingUpId === agent.agentId}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    >
                      <FolderCheck className={`w-3.5 h-3.5 ${settingUpId === agent.agentId ? 'animate-bounce' : ''}`} />
                      {settingUpId === agent.agentId ? (setupProgress || 'Working...') : 'Set Up on This PC'}
                    </button>
                  )}
                  <button
                    onClick={() => handleDownload(agent.agentId)}
                    disabled={downloadingId === agent.agentId}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    <Download className={`w-3.5 h-3.5 ${downloadingId === agent.agentId ? 'animate-bounce' : ''}`} />
                    {downloadingId === agent.agentId ? 'Downloading...' : canSetupDirectly ? 'Or Download Zip' : 'Download Again'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}