function hasBatchim(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const lastChar = trimmed[trimmed.length - 1];
  const codePoint = lastChar.charCodeAt(0);

  if (codePoint < 0xac00 || codePoint > 0xd7a3) {
    return false;
  }

  return (codePoint - 0xac00) % 28 !== 0;
}

export function topicParticle(value: string): string {
  return hasBatchim(value) ? '은' : '는';
}

export function objectParticle(value: string): string {
  return hasBatchim(value) ? '을' : '를';
}
