/**
 * Calculate estimated wait time based on booked slots, walk-ins, time of day, and day of week.
 * @param {number} onlineBookingsRemaining 
 * @param {number} offlineWalkIns
 * @param {Date} [dateTime] 
 */
export function calculateWaitTime(onlineBookingsRemaining, offlineWalkIns, dateTime = new Date()) {
  const remainingOnline = Math.max(0, onlineBookingsRemaining || 0);
  const walkIns = Math.max(0, offlineWalkIns || 0);
  
  const totalQueue = remainingOnline + walkIns;
  const baseWait = totalQueue * 15;

  const hour = dateTime.getHours();
  let timeOfDayMultiplier = 1.0;

  if (hour >= 6 && hour <= 8) timeOfDayMultiplier = 0.8;
  else if (hour >= 9 && hour <= 10) timeOfDayMultiplier = 1.5;
  else if (hour >= 11 && hour <= 13) timeOfDayMultiplier = 1.1;
  else if (hour >= 14 && hour <= 15) timeOfDayMultiplier = 1.0;
  else if (hour >= 16 && hour <= 18) timeOfDayMultiplier = 1.3;
  else if (hour >= 19 && hour <= 21) timeOfDayMultiplier = 0.9;
  else timeOfDayMultiplier = 0.6;

  const day = dateTime.getDay();
  let dayMultiplier = 1.0;

  if (day === 1) dayMultiplier = 1.4;
  else if (day === 5) dayMultiplier = 1.2;
  else if (day === 6) dayMultiplier = 0.9;
  else if (day === 0) dayMultiplier = 0.7;

  const estimatedWaitMinutes = Math.round(baseWait * timeOfDayMultiplier * dayMultiplier);

  let waitColor = 'green';
  if (estimatedWaitMinutes >= 16 && estimatedWaitMinutes <= 45) {
    waitColor = 'amber';
  } else if (estimatedWaitMinutes >= 46) {
    waitColor = 'red';
  }

  let waitLabel;
  if (totalQueue === 0) {
    waitLabel = 'No wait';
    waitColor = 'green';
  } else if (estimatedWaitMinutes < 60) {
    waitLabel = `~${estimatedWaitMinutes} min`;
  } else {
    const hrs = Math.floor(estimatedWaitMinutes / 60);
    const mins = estimatedWaitMinutes % 60;
    waitLabel = `~${hrs}h ${mins > 0 ? mins + 'm' : ''}`;
  }

  return {
    estimatedWaitMinutes,
    waitLabel,
    waitColor,
    totalQueue
  };
}
