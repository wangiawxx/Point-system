// Monthly points cycle: 09:00 on the first day of each month in Asia/Shanghai.
// Returned dates are UTC instants, independent of the server timezone.
export function currentChinaMonth(now: Date = new Date()) {
  const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaNow.getUTCFullYear();
  const month = chinaNow.getUTCMonth();
  const boundary = Date.UTC(year, month, 1, 1);
  const cycleMonth = now.getTime() < boundary ? month - 1 : month;
  return {
    start: new Date(Date.UTC(year, cycleMonth, 1, 1)),
    end: new Date(Date.UTC(year, cycleMonth + 1, 1, 1)),
  };
}
