const SUBMISSION_KEY = 'feedbackai.currentSubmissionId';
const SESSION_KEY = 'feedbackai.currentSessionId';

export function getCurrentSubmissionId() {
  return localStorage.getItem(SUBMISSION_KEY);
}

export function setCurrentSubmissionId(id) {
  if (id) {
    localStorage.setItem(SUBMISSION_KEY, id);
    return;
  }

  localStorage.removeItem(SUBMISSION_KEY);
}

export function getCurrentSessionId() {
  return localStorage.getItem(SESSION_KEY);
}

export function setCurrentSessionId(id) {
  if (id) {
    localStorage.setItem(SESSION_KEY, id);
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

export function clearCurrentFlow() {
  localStorage.removeItem(SUBMISSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}
