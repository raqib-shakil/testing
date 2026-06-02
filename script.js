const SHEET_ID = '1KE8hsIJGtrpnOzCEnsDj-dZQXeLdMe4VbQ3JH68yz9g';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\r' && next === '\n') {
        row.push(field); field = '';
        rows.push(row); row = []; i++;
      } else if (ch === '\n' || ch === '\r') {
        row.push(field); field = '';
        rows.push(row); row = [];
      } else {
        field += ch;
      }
    }
  }

  if (row.length > 0 || field) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function renderTable(rows) {
  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  rows[0].forEach(cell => {
    const th = document.createElement('th');
    th.textContent = cell;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.slice(1).forEach(rowData => {
    const tr = document.createElement('tr');
    rowData.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  return table;
}

async function loadSheet() {
  const container = document.getElementById('sheet-container');
  const status = document.getElementById('sheet-status');

  try {
    const res = await fetch(CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length === 0) throw new Error('Sheet appears to be empty.');
    status.remove();
    container.appendChild(renderTable(rows));
  } catch (err) {
    status.textContent = `Could not load data: ${err.message}`;
    status.classList.add('error');
  }
}

loadSheet();
