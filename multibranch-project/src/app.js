function resolveBranchMessage(branchName) {
  if (!branchName || branchName === 'local') {
    return 'Running locally outside Jenkins.';
  }

  if (branchName === 'main') {
    return 'Main branch: production deployment simulation.';
  }

  if (branchName === 'development') {
    return 'Development branch: integration delivery simulation.';
  }

  if (branchName.startsWith('release/')) {
    return 'Release branch: staging validation simulation.';
  }

  if (branchName.startsWith('feature/')) {
    return 'Feature branch: preview validation simulation.';
  }

  return `Branch ${branchName}: standard branch validation.`;
}

const branchName = window.JENKINS_BRANCH_NAME || 'local';
const statusMessage = document.querySelector('[data-branch-status]');

if (statusMessage) {
  statusMessage.textContent = resolveBranchMessage(branchName);
}
