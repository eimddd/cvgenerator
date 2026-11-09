// Dates typed as digits only: 06122005 → 06/12/2005 (JJ/MM/AAAA). allowYear also accepts 2019 alone.
export function typedDate(raw, allowYear = false) {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2 || (allowYear && d.length <= 4)) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// finished: the person has left the field, so a half-typed date counts as a problem too
export function dateProblem(value, allowYear = false, finished = false) {
  if (!value || /[^\d/]/.test(value)) return false; // older CVs may hold "19 janvier 1995": leave those alone
  const d = value.replace(/\D/g, '');
  if (allowYear && d.length <= 4) return finished ? !(d.length === 4 && +d >= 1900 && +d <= 2100) : false;
  const day = +d.slice(0, 2), month = +d.slice(2, 4), year = +d.slice(4);
  if (d.length >= 2 && (day < 1 || day > 31)) return true;
  if (d.length >= 4 && (month < 1 || month > 12)) return true;
  if (d.length < 8) return finished;
  // also refuses dates that don't exist, such as 31/02/2020
  const real = new Date(year, month - 1, day);
  return year < 1900 || year > 2100 || real.getMonth() !== month - 1;
}
