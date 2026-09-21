/**
 * 정렬된 풀에서 필요한 길이만큼의 시퀀스를 만든다.
 * 앞쪽(점수가 높은) 항목이 더 자주 등장하되, 매 바퀴(lap)마다 시작 위치를 옮겨
 * 같은 항목이 매번 같은 자리에서 반복되지 않도록 한다.
 */
export function buildCyclicSequence<T>(pool: T[], length: number): T[] {
  if (pool.length === 0) return [];
  const sequence: T[] = [];
  let lap = 0;
  while (sequence.length < length) {
    const offset = lap % pool.length;
    for (let i = 0; i < pool.length && sequence.length < length; i++) {
      sequence.push(pool[(i + offset) % pool.length]);
    }
    lap++;
  }
  return sequence;
}
