/**
 * progress.js - centralized access gating and challenge progress for the valentine site
 */

// -- Access Gate --
function setAccessGranted() {
  try { localStorage.setItem('access.granted', 'true'); } catch(e) {}
}
function isAccessGranted() {
  try { return localStorage.getItem('access.granted') === 'true'; } catch(e) { return false; }
}
function guardAccess() {
  if (!isAccessGranted()) window.location.href = 'gate.html';
}

// -- Progress --
function getProgress() {
  try {
    return JSON.parse(localStorage.getItem('progress')) || {};
  } catch(e) {
    return {};
  }
}
function setProgress(obj) {
  try {
    localStorage.setItem('progress', JSON.stringify(obj));
  } catch(e) {}
}
function markChallengeComplete(key) {
  const p = getProgress();
  p[key] = true;
  setProgress(p);
}
function isAllComplete() {
  const p = getProgress();
  return !!p.wordle && !!p.basketball && !!p.wordsearch;
}
