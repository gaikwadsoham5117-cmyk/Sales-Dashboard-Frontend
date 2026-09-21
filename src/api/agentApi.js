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
    const response = await axiosClient.post('/api/agents/create/organization', { agentName });
    return response.data;
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

export async function fetchAgentConfigTextApi(agentId) {
  try {
    const response = await axiosClient.get(`/api/agents/organization/${agentId}/config`, {
      responseType: 'text',
      transformResponse: [(data) => data],
    });
    return response.data;
  } catch (err) {
    const msg = err.response?.status === 404
      ? 'Agent not found, or it does not belong to this account.'
      : err.message || 'Unable to fetch agent config.';
    throw new Error(msg);
  }
}

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

export function supportsDirectPcSetup() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function setupAgentOnThisPc(agentId, onProgress) {
  if (!supportsDirectPcSetup()) {
    throw new Error(
      'Your browser doesn\'t support direct folder setup. Use Chrome or Edge, or download the files manually below.'
    );
  }

  onProgress?.('Waiting for folder selection...');

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

  return dirHandle.name;
}
