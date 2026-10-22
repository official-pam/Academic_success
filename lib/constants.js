export const LEVELS = [100, 200, 300, 400, 500];
export const levelLabel = (l) => (l ? `${l}L` : 'All levels');
export const ROLE_LABEL = { member: 'Member', coordinator: 'Level coordinator', chairman: 'Chairman' };

// Reading shares are hidden for groups this small, so totals can't reveal one person's activity.
export const MIN_GROUP = 3;
