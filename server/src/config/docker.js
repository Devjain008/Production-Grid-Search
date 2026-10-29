const Docker = require('dockerode');
const config = require('./index');

let dockerInstance = null;

function getDockerClient() {
  if (dockerInstance) return dockerInstance;

  const options = {};
  if (process.env.DOCKER_HOST) {
    const url = new URL(process.env.DOCKER_HOST);
    options.host = url.hostname;
    options.port = url.port;
  } else if (process.platform === 'win32') {
    options.socketPath = config.dockerSocketPath || '//./pipe/docker_engine';
  } else {
    options.socketPath = config.dockerSocketPath || '/var/run/docker.sock';
  }

  dockerInstance = new Docker(options);
  return dockerInstance;
}

async function isDockerAvailable() {
  try {
    const docker = getDockerClient();
    await docker.ping();
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = {
  getDockerClient,
  isDockerAvailable
};
