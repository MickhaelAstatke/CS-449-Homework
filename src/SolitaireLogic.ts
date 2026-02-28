export const pegAt = "A1";
export const holeAt = "A3";
export const occupiedSpace = "B1";

export function canJump(from: string, to: string): boolean {
    if (to === occupiedSpace) return false;
    return (from === pegAt && to === holeAt);
}