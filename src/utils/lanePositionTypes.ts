
export type LanePosition = 'left' | 'centered' | 'right';

// Add type guard functions to safely check lane positions
export function isLeftLane(position: LanePosition): boolean {
  return position === 'left';
}

export function isCenteredLane(position: LanePosition): boolean {
  return position === 'centered';
}

export function isRightLane(position: LanePosition): boolean {
  return position === 'right';
}
