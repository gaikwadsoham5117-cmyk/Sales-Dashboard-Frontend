import axiosClient from './axiosClient';

export async function getMyAgentsApi() {
  try {
    const response = await axiosClient.get('/api/agents');
    return response.data || [];
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Unable to fetch agents.';
    throw new Error(typeof msg === 'string' ? msg : 'Unable to fetch agents.');
  }
}


export async function createAgentApi(agentName) {
  try {
    const response = await axiosClient.post('/api/agents', { agentName });
    return response.data; // { id, agentId, userId, agentKey, agentName, status, ... }
  } catch (err) {
    const msg = err.response?.data?.message || err.response?.data || err.message || 'Unable to create agent.';
    throw new Error(typeof msg === 'string' ? msg : 'Unable to create agent.');
  }
}



export async function downloadAgentSeparateFiles(agentId) {
  const jarBuffer = await fetchAgentJarApi();
  triggerBrowserDownload(new Blob([jarBuffer]), 'tally-agent.jar');

  const configText = await fetchAgentConfigTextApi(agentId);
  triggerBrowserDownload(new Blob([configText], { type: 'text/plain' }), 'agent.properties');
}

export async function fetchAgentJarApi() {
  try {
    const response = await fetch('/tally-agent.jar');
    if (!response.ok) {
      throw new Error(`Could not load tally-agent.jar (${response.status}). Make sure it's in the public folder.`);
    }
    return await response.arrayBuffer();
  } catch (err) {
    throw new Error(err.message || 'Unable to fetch agent jar.');
  }
}

// GET /api/agents/{agentId}/config -> plain text agent.properties, pre-filled
// for this specific agent.
export async function fetchAgentConfigTextApi(agentId) {
  try {
    const response = await axiosClient.get(`/api/agents/${agentId}/config`, {
      responseType: 'text',
      transformResponse: [(data) => data], // keep as raw text, don't let axios try to JSON-parse it
    });
    return response.data; // string
  } catch (err) {
    const msg = err.response?.status === 404
      ? 'Agent not found, or it does not belong to this account.'
      : err.message || 'Unable to fetch agent config.';
    throw new Error(msg);
  }
}

// Triggers the browser's normal "Save As" download behavior for a Blob we
// already fetched with the Authorization header attached - a plain <a href>
// can't do this part, since it can't send auth headers.
export function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// True only in browsers that support picking/writing to a real folder on
// disk (Chrome, Edge - not Firefox/Safari as of this writing).
export function supportsDirectPcSetup() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

// The one-click flow: user picks (or creates) a folder ONCE via the native
// Windows dialog, we write tally-agent.jar and agent.properties straight
// into it - no separate downloads, no manually moving files into place.
//
// Browser security means we can't silently pick "C:\TallyAgent" for them
// or create it without their involvement - showDirectoryPicker always
// requires a real user gesture and a folder they explicitly select/create
// in the dialog. This is the closest a website can legally get to "auto
// setup" without a native installer.
export async function setupAgentOnThisPc(agentId, onProgress) {
  if (!supportsDirectPcSetup()) {
    throw new Error(
      'Your browser doesn\'t support direct folder setup. Use Chrome or Edge, or download the files manually below.'
    );
  }

  onProgress?.('Waiting for folder selection...');

  // User navigates to (or creates) e.g. C:\TallyAgent in this native picker.
  const dirHandle = await window.showDirectoryPicker({
    id: 'tally-agent-folder',
    mode: 'readwrite',
    startIn: 'desktop',
  });

  onProgress?.('Downloading agent...');
  const jarBuffer = await fetchAgentJarApi();

  onProgress?.('Fetching your settings...');
  const configText = await fetchAgentConfigTextApi(agentId);

  onProgress?.('Writing files to folder...');

  const jarFileHandle = await dirHandle.getFileHandle('tally-agent.jar', { create: true });
  const jarWritable = await jarFileHandle.createWritable();
  await jarWritable.write(jarBuffer);
  await jarWritable.close();

  const configFileHandle = await dirHandle.getFileHandle('agent.properties', { create: true });
  const configWritable = await configFileHandle.createWritable();
  await configWritable.write(configText);
  await configWritable.close();

  return dirHandle.name; // folder name, for the success message
}
