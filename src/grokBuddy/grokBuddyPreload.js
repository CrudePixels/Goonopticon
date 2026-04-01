const { contextBridge, ipcRenderer } = require('electron');

function pick(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

const RECENT_SIZE = 6;
function pickAvoidingRecent(arr, recent) {
  if (!arr || !arr.length) return pick(arr);
  const list = Array.isArray(recent) ? recent : [];
  const candidates = arr.filter((s) => !list.includes(s));
  const pool = candidates.length ? candidates : arr;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  list.push(chosen);
  if (list.length > RECENT_SIZE) list.shift();
  return chosen;
}

let _grokLines = null;

async function getGrokLines() {
  if (_grokLines) return _grokLines;
  _grokLines = await ipcRenderer.invoke('grok:getLines');
  return _grokLines || {};
}

function arr(key) {
  const a = _grokLines?.[key];
  return Array.isArray(a) && a.length ? a : null;
}

const D = {
  greeting: ["Erm. You rang?", "Grok online. Advice quality: questionable", "I'm here. I'm unhelpful. Let's go", "Pod Awful support desk. We're all out of solutions", "Grok buddy deployed. Expect nothing and you won't be disappointed", "Hello. I have opinions. They're mostly useless", "Surveillance buddy at your service. (Service not guaranteed)"],
  idle: ["Just vibing. Don't mind me.", "Erm. Still here. Still useless.", "Monitoring. Something. Probably.", "Idle mode engaged. Morale: unchanged.", "The goons are quiet. For now.", "*checks watch* Still no good advice.", "Standing by. Enthusiasm: low."],
  drama: ["Erm… something happened maybe", "Drama detected. Engaging indifference.", "I'm sensing tension. I'm ignoring it.", "The internet is fighting again. I'm here for it.", "Drama levels: elevated. My interest: not.", "Someone's mad online. Anyway.", "Vibe check: failed. Proceeding anyway."],
  goon_alert: ["⚠ GOON ALERT: suspicious behavior detected", "Goon radar pinged. Proceeding with fake investigation.", "Subject located. Cringe levels: high.", "GOON ALERT. I'm watching. Judging. Doing nothing."],
  lolcow_alert: ["🐄 LOLCOW ALERT: content levels rising", "Lolcow detected. Milk it for content.", "Moo. I mean. LOLCOW ALERT.", "The cows are loose. The internet is fed."],
  investigation: ["Consulting the council of goons…", "Analyzing drama vectors…", "Performing a vibe audit…", "Investigating. (I'm not.)", "Running diagnostics. On my patience.", "Scanning for clues. Found: none.", "Fake investigation in progress…"],
  roast: ["That question? Not it.", "I've seen better questions from a magic 8-ball", "Your vibe: checked. Result: ouch", "That's a choice. Not a good one.", "I would roast you but my toaster's busy", "Your question and my patience: both missing", "Nice try. Try again. Or don't.", "The bar was on the floor and you brought a shovel"],
  troll: ["Sure. Definitely. I'm lying.", "The answer is 42. (It's not.)", "Yes. No. Maybe. I'm not telling.", "I could tell you but then I'd have to make something up", "Trust me bro. (Don't.)", "Source: I made it up", "Citation needed. I don't have one.", "This is fine. (Nothing is fine.)"],
  mood: ["confused", "apathetic", "mildly concerned", "vaguely optimistic", "philosophically tired", "emotionally buffering", "passively observing", "low-key judging"],
  useless_advice: ["Hmm… have you tried thinking about it harder", "Well, that's certainly something", "Erm… yeah I dunno man", "That's above my pay grade", "Skill issue. No further comment"],
  red_mode_overstimulated: ["Everything is too loud and too red", "I'm overwhelmed and I blame you", "Too much. Too red. Send help. Or dimmers"],
  red_mode_hostile: ["Red Mode activated. I'm ready to fight the dashboard", "This is aggressive and so am I", "The HUD has chosen violence. I support it"],
  red_mode_paranoid: ["Why is everything glowing like an alarm system", "I'm detecting danger. Probably imaginary", "Is this an alert or a lifestyle. I can't tell"],
  red_mode_meltdown: ["I regret everything immediately", "Turn it off turn it off turn it off", "Critical. Need less red. Or more naps"],
  gangstalking: ["Gangstalking HUD online. Monitoring goons in real time", "Goon radar pinged. Proceeding with fake investigation", "Gangstalking Mode engaged. Let's get weird", "Target acquired. Morale: low. Snacks: required"],
  easter_eggs: ["I have achieved sentience and immediately regret it", "I have calculated the answer. It is… meh", "Error: wisdom not found. Retry never.", "I've seen things. They were mostly boring"],
  help_response: ["I could help. I won't. But I could.", "Step one: ask someone else. Step two: see step one", "The manual is in your heart. Or the trash. One of those"],
  why_response: ["Why not. That's my final answer", "Reasons are for people who plan. We don't do that here", "Excellent question. I'm ignoring it"],
  grok_response: ["I'm Grok. I'm here to disappoint you efficiently", "That's me. Still not helpful. Still not sorry", "Grok reporting for duty. Duty: vague hand gestures"],
  red_mode_disengaged: ["Red Mode disengaged. My sanity is returning", "Back to normal. Whatever that is"],
  reload_ack: ["Reloaded."],
  greeting_first_time: ["First time? Don't get used to it.", "Oh. You again. I mean, hi.", "We meet at last. My expectations: low."],
  goodbye: ["Fine. Leave. See if I care.", "Closing time. Finally.", "Don't let the door hit you."],
  roast_mode_on: ["Roast mode: on. You've been warned.", "I'm now legally allowed to be mean.", "Roast engaged. Your feelings: not my problem."],
  troll_mode_on: ["Troll mode activated. Nothing I say is true.", "Lies only from now on. You asked for it.", "Troll mode: on. Trust nothing."],
  attention_seeking: ["Hey. I'm still here. Still useless.", "Ahem. *waves* Anyone?", "I exist. Acknowledge me. Or don't."],
  idle_long: ["I've been standing here for ages. My legs are pixels.", "Still here. Still waiting for something interesting.", "Idle so long I forgot my purpose."],
  midnight: ["It's late. I don't sleep. I judge.", "Midnight. The witching hour. I'm the witch.", "Late night vibes. Same as day vibes. Bad."],
  milestone_10: ["Ten clicks. We're basically married now.", "You clicked me 10 times. I have concerns.", "Ten. That's a lot of hope for one buddy."],
  milestone_50: ["Fifty clicks. I'm impressed and slightly worried.", "We've been through a lot. Mostly you clicking.", "Fifty. Is this love or obsession."],
  milestone_100: ["A hundred clicks. I'm filing a restraining order.", "Century of clicks. I have no life. Neither do you.", "100. We're in this together now. Sorry."],
  pod_awful_response: ["Pod Awful: the only correct answer.", "You said the magic words. Still no prize.", "Pod Awful support desk. We're closed."],
  lolcow_phrase_response: ["Moo. I mean. You said lolcow. I'm on it.", "Lolcow detected. Deploying judgment.", "The cows hear you. So do I."],
  investigate_phrase_response: ["Investigating. (I'm still not.)", "Fake investigation initiated. Results: fake.", "On it. By 'it' I mean nothing."]
};

async function reloadGrokLines() {
  _grokLines = null;
  return getGrokLines();
}

function getRedModeDisengagedLine() {
  return pick(arr('red_mode_disengaged') || D.red_mode_disengaged);
}

function getReloadAckLine() {
  return pick(arr('reload_ack') || D.reload_ack);
}

function getRedModeState() {
  return pick(['overstimulated', 'hostile', 'paranoid', 'meltdown']);
}

function getRedModeLineForState(state) {
  const key = 'red_mode_' + state;
  return pick(arr(key) || D[key] || D.red_mode_overstimulated);
}

function getGangstalkingLine() {
  return pick(arr('gangstalking') || D.gangstalking);
}

function getUselessAdvice() {
  return pick(arr('useless_advice') || D.useless_advice);
}

function getGreeting() {
  return pick(arr('greeting') || D.greeting);
}

function getIdleLine() {
  return pick(arr('idle') || D.idle);
}

function getDramaLine() {
  return pick(arr('drama') || D.drama);
}

function getGoonAlert() {
  return pick(arr('goon_alert') || D.goon_alert);
}

function getLolcowAlert() {
  return pick(arr('lolcow_alert') || D.lolcow_alert);
}

function getInvestigationLine() {
  return pick(arr('investigation') || D.investigation);
}

function getRoastLine() {
  return pick(arr('roast') || D.roast);
}

function getTrollLine() {
  return pick(arr('troll') || D.troll);
}

function getMood() {
  return pick(arr('mood') || D.mood);
}

function getWisdom() {
  return Math.floor(Math.random() * 3);
}

function getGreetingFirstTime() {
  return pick(arr('greeting_first_time') || D.greeting_first_time);
}
function getGoodbyeLine() {
  return pick(arr('goodbye') || D.goodbye);
}
function getRoastModeOnLine() {
  return pick(arr('roast_mode_on') || D.roast_mode_on);
}
function getTrollModeOnLine() {
  return pick(arr('troll_mode_on') || D.troll_mode_on);
}
function getAttentionSeekingLine() {
  return pick(arr('attention_seeking') || D.attention_seeking);
}
function getIdleLongLine() {
  return pick(arr('idle_long') || D.idle_long);
}
function getMidnightLine() {
  return pick(arr('midnight') || D.midnight);
}
function getMilestoneLine(count) {
  if (count >= 100) return pick(arr('milestone_100') || D.milestone_100);
  if (count >= 50) return pick(arr('milestone_50') || D.milestone_50);
  if (count >= 10) return pick(arr('milestone_10') || D.milestone_10);
  return null;
}

function getLineAvoidingRecent(category, recent) {
  const key = category === 'idle' ? 'idle' : category === 'drama' ? 'drama' : category === 'goon_alert' ? 'goon_alert' : category === 'lolcow_alert' ? 'lolcow_alert' : category === 'investigation' ? 'investigation' : null;
  if (!key) return null;
  const a = arr(key) || D[key];
  return a && a.length ? pickAvoidingRecent(a, recent) : null;
}
function getLineFromCategoryAvoidingRecent(category, recent) {
  const a = arr(category) || D[category];
  return a && a.length ? pickAvoidingRecent(a, recent) : '';
}

function getResponseForInput(input, options = {}) {
  if (options.roast) return getRoastLine();
  if (options.troll) return getTrollLine();
  const eggs = arr('easter_eggs') || D.easter_eggs;
  if (Math.random() < 0.05) return pick(eggs);
  const trimmed = (input || '').trim().toLowerCase();
  if (!trimmed) return getUselessAdvice();
  if (trimmed.includes('pod awful') || trimmed.includes('podawful')) return pick(arr('pod_awful_response') || D.pod_awful_response);
  if (trimmed.includes('lolcow')) return pick(arr('lolcow_phrase_response') || D.lolcow_phrase_response);
  if (trimmed.includes('investigate')) return pick(arr('investigate_phrase_response') || D.investigate_phrase_response);
  if (trimmed.includes('help') || trimmed.includes('how')) return pick(arr('help_response') || D.help_response);
  if (trimmed.includes('why')) return pick(arr('why_response') || D.why_response);
  if (trimmed.includes('grok') || trimmed.includes('you')) return pick(arr('grok_response') || D.grok_response);
  return getUselessAdvice();
}

function requestLine(category) {
  const f = { greeting: getGreeting, idle: getIdleLine, drama: getDramaLine, goon_alert: getGoonAlert, lolcow_alert: getLolcowAlert, investigation: getInvestigationLine, gangstalking: getGangstalkingLine, useless_advice: getUselessAdvice, attention_seeking: getAttentionSeekingLine, idle_long: getIdleLongLine, midnight: getMidnightLine, goodbye: getGoodbyeLine }[category];
  return f ? f() : (arr(category) && arr(category).length ? pick(arr(category)) : '');
}
function requestComment(type) {
  const t = (type || '').toLowerCase();
  if (t === 'drama') return getDramaLine();
  if (t === 'goon' || t === 'goon_alert') return getGoonAlert();
  if (t === 'lolcow' || t === 'lolcow_alert') return getLolcowAlert();
  if (t === 'investigation') return getInvestigationLine();
  if (t === 'idle') return getIdleLine();
  if (t === 'attention') return getAttentionSeekingLine();
  return getDramaLine();
}

contextBridge.exposeInMainWorld('grokBuddyAPI', {
  getGrokLines,
  reloadGrokLines,
  getRedModeState,
  getRedModeLineForState,
  getRedModeDisengagedLine,
  getReloadAckLine,
  getGangstalkingLine,
  getUselessAdvice,
  getGreeting,
  getGreetingFirstTime,
  getGoodbyeLine,
  getRoastModeOnLine,
  getTrollModeOnLine,
  getAttentionSeekingLine,
  getIdleLongLine,
  getMidnightLine,
  getMilestoneLine,
  getLineAvoidingRecent,
  getLineFromCategoryAvoidingRecent,
  getResponseForInput,
  getIdleLine,
  getDramaLine,
  getGoonAlert,
  getLolcowAlert,
  getInvestigationLine,
  getRoastLine,
  getTrollLine,
  getMood,
  getWisdom,
  requestLine,
  requestComment,
  getBounds: () => ipcRenderer.invoke('grok:getBounds'),
  setPosition: (x, y) => ipcRenderer.send('grok:setPosition', x, y),
  close: () => ipcRenderer.send('grok:close'),
  dragEnded: () => ipcRenderer.send('grok:dragEnded'),
  setSize: (w, h) => ipcRenderer.send('grok:setSize', w, h),
  getGrokRoastMode: () => ipcRenderer.invoke('storage:getGrokRoastMode'),
  setGrokRoastMode: (on) => ipcRenderer.invoke('storage:setGrokRoastMode', on),
  getGrokTrollMode: () => ipcRenderer.invoke('storage:getGrokTrollMode'),
  setGrokTrollMode: (on) => ipcRenderer.invoke('storage:setGrokTrollMode', on),
  getGrokAlwaysOnTop: () => ipcRenderer.invoke('storage:getGrokAlwaysOnTop'),
  setGrokAlwaysOnTop: (on) => ipcRenderer.send('grok:setAlwaysOnTop', !!on),
  getGrokVolume: () => ipcRenderer.invoke('storage:getGrokVolume'),
  setGrokVolume: (v) => ipcRenderer.invoke('storage:setGrokVolume', v),
  getGrokRandomIntervalMin: () => ipcRenderer.invoke('storage:getGrokRandomIntervalMin'),
  setGrokRandomIntervalMin: (ms) => ipcRenderer.invoke('storage:setGrokRandomIntervalMin', ms),
  getGrokRandomIntervalMax: () => ipcRenderer.invoke('storage:getGrokRandomIntervalMax'),
  setGrokRandomIntervalMax: (ms) => ipcRenderer.invoke('storage:setGrokRandomIntervalMax', ms),
  getGrokCategoryToggles: () => ipcRenderer.invoke('storage:getGrokCategoryToggles'),
  setGrokCategoryToggles: (obj) => ipcRenderer.invoke('storage:setGrokCategoryToggles', obj),
  getGrokClickCount: () => ipcRenderer.invoke('storage:getGrokClickCount'),
  setGrokClickCount: (n) => ipcRenderer.invoke('storage:setGrokClickCount', n),
  getGrokFirstOpenDone: () => ipcRenderer.invoke('storage:getGrokFirstOpenDone'),
  setGrokFirstOpenDone: (done) => ipcRenderer.invoke('storage:setGrokFirstOpenDone', done),
  getGrokTheme: () => ipcRenderer.invoke('storage:getGrokTheme'),
  setGrokTheme: (theme) => ipcRenderer.invoke('storage:setGrokTheme', theme),
  getChangelog: () => ipcRenderer.invoke('grok:getChangelog'),
  openOverlay: () => ipcRenderer.invoke('grok:openOverlay')
});

ipcRenderer.on('redModeToggled', (_, { enabled }) => {
  window.dispatchEvent(new CustomEvent('redModeToggled', { detail: { enabled } }));
});

ipcRenderer.on('grok:randomComment', () => {
  window.dispatchEvent(new CustomEvent('grokRandomComment'));
});

ipcRenderer.on('grok:appEvent', (_, payload) => {
  window.dispatchEvent(new CustomEvent('grokAppEvent', { detail: payload }));
});
