import React, { useState, useEffect } from 'react';
import {
  getMyAgentsApi,
  createAgentApi,
  downloadAgentSeparateFiles,
  setupAgentOnThisPc,
  supportsDirectPcSetup,
} from '../api/agentApi';
import {
  Download,
  Server,
  Wifi,
  WifiOff,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  Info,
  FolderCheck,
  CheckCircle2,
  ExternalLink,
  Terminal,
  Copy,
  Check,
} from 'lucide-react';

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
}

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
        `Agent files saved to "${folderName}". Open Command Prompt in that folder (e.g. C:\\tally_agent) and run: java -jar tally-agent.jar`
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
          Follow the 3-step guide below to configure and run the agent.
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

      {/* 3-Step Agent Setup Guide on PC */}
      <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm lg:text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Steps to Set Up Agent on Your PC
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Follow these 3 easy steps to install Java, download the agent files, and run the service.
            </p>
          </div>
          <span className="self-start sm:self-auto px-2.5 py-1 text-[11px] font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            3 Step Guide
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold text-xs border border-indigo-500/30">
                  1
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-900/60">
                  Prerequisite
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Download & Install Java 21</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The agent requires Java 21 to run on your PC.
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <p className="text-slate-400 font-medium">
                  1. Visit Oracle JDK 21 downloads:
                </p>
                <a
                  href="https://www.oracle.com/java/technologies/javase/jdk21-archive-downloads.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 transition-colors w-full text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Oracle Java 21 Downloads
                </a>
                <p className="text-slate-400 pt-1">
                  2. Download the <strong className="text-cyan-300">Windows x64 MSI Installer</strong>.
                </p>
                <p className="text-slate-400">
                  3. Run the installer and finish the Java setup wizard.
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-mono text-[10px] text-slate-400">java -version</span>
              <CopyButton text="java -version" label="Check Java" />
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-cyan-600/20 text-cyan-400 font-bold text-xs border border-cyan-500/30">
                  2
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/60">
                  Download
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Download Agent Files</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Save agent files to your PC in <code className="text-slate-300">C:\tally_agent</code>.
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Target Folder:</span>
                  <CopyButton text="C:\tally_agent" label="Copy Path" />
                </div>
                <div className="bg-slate-950 px-2.5 py-1.5 rounded border border-slate-800 font-mono text-xs text-amber-300 truncate">
                  C:\tally_agent
                </div>
                <p className="text-slate-400 pt-1">
                  Use the section below to download:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                  <li><code className="text-cyan-300 font-mono">tally-agent.jar</code></li>
                  <li><code className="text-cyan-300 font-mono">agent.properties</code></li>
                </ul>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-slate-400">Create folder via CMD:</span>
              <CopyButton text="mkdir C:\tally_agent" label="mkdir" />
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col justify-between p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600/20 text-emerald-400 font-bold text-xs border border-emerald-500/30">
                  3
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                  Run in CMD
                </span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Open CMD & Run Agent</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Open Command Prompt in <code className="text-slate-300">C:\tally_agent</code> and run.
                </p>
              </div>

              <div className="space-y-2 text-[11px] text-slate-300 bg-slate-900/90 p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between text-slate-400">
                  <span>1. Open folder in CMD:</span>
                  <CopyButton text="cd /d C:\tally_agent" label="Copy" />
                </div>
                <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-xs text-slate-200 truncate">
                  cd /d C:\tally_agent
                </div>

                <div className="flex items-center justify-between text-slate-400 pt-1">
                  <span>2. Run agent:</span>
                  <CopyButton text="java -jar tally-agent.jar" label="Copy" />
                </div>
                <div className="bg-slate-950 px-2 py-1 rounded border border-slate-800 font-mono text-xs text-emerald-400 truncate">
                  java -jar tally-agent.jar
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="text-slate-400">Run one-liner in CMD:</span>
              <CopyButton text="cd /d C:\tally_agent && java -jar tally-agent.jar" label="Copy One-Liner" />
            </div>
          </div>
        </div>
      </div>

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
            ? "You'll be asked to pick or create a folder (e.g. C:\\tally_agent) - tally-agent.jar and agent.properties will be saved straight into it."
            : 'Downloads tally-agent.jar and agent.properties. Place both files in C:\\tally_agent and run via CMD.'}
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