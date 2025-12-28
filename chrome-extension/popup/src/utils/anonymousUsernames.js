// Generate a random anonymous username
const adjectives = [
  'Swift', 'Bold', 'Clever', 'Bright', 'Sharp', 'Quick', 'Wise', 'Calm',
  'Brave', 'Cool', 'Fresh', 'Smart', 'Neat', 'Prime', 'Solid', 'True',
  'Vivid', 'Zest', 'Apex', 'Nova', 'Zen', 'Echo', 'Flow', 'Glow'
];

const nouns = [
  'Tiger', 'Eagle', 'Wolf', 'Lion', 'Fox', 'Hawk', 'Bear', 'Shark',
  'Phoenix', 'Dragon', 'Falcon', 'Panther', 'Jaguar', 'Raven', 'Cobra', 'Viper',
  'Comet', 'Star', 'Nova', 'Apex', 'Zen', 'Echo', 'Flow', 'Glow'
];

export function generateAnonymousUsername() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 1000);
  return `${adjective}${noun}${number}`;
}

