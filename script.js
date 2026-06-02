const SHEET_ID = '1KE8hsIJGtrpnOzCEnsDj-dZQXeLdMe4VbQ3JH68yz9g';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// After deploying the Apps Script web app, paste the URL here:
const APPS_SCRIPT_URL = '';

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

let allRows = [];

function buildTable(headers, dataRows) {
  const table = document.createElement('table');

  const thead = document.createElement('thead');

  const headerRow = document.createElement('tr');
  headers.forEach(cell => {
    const th = document.createElement('th');
    th.textContent = cell;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const filterRow = document.createElement('tr');
  filterRow.className = 'filter-row';
  headers.forEach((header, colIndex) => {
    const th = document.createElement('th');
    if (header.trim().toLowerCase() === 'category') {
      const select = document.createElement('select');
      select.dataset.colIndex = colIndex;

      const uniqueVals = [...new Set(
        dataRows.map(row => (row[colIndex] ?? '').trim())
      )].filter(v => v !== '').sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

      const allOpt = document.createElement('option');
      allOpt.value = '';
      allOpt.textContent = 'All';
      select.appendChild(allOpt);

      uniqueVals.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = val;
        select.appendChild(opt);
      });

      select.addEventListener('change', applyFilter);
      th.appendChild(select);
    }
    filterRow.appendChild(th);
  });
  thead.appendChild(filterRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  tbody.id = 'table-body';
  table.appendChild(tbody);

  return table;
}

function updateBody(dataRows) {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  dataRows.forEach(rowData => {
    const tr = document.createElement('tr');
    rowData.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function applyFilter() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const rowCount = document.getElementById('row-count');
  const dataRows = allRows.slice(1);

  const colFilters = {};
  document.querySelectorAll('select[data-col-index]').forEach(sel => {
    if (sel.value) colFilters[parseInt(sel.dataset.colIndex)] = sel.value;
  });

  const filtered = dataRows.filter(row => {
    if (query && !row.some(cell => cell.toLowerCase().includes(query))) return false;
    for (const [idx, val] of Object.entries(colFilters)) {
      if ((row[parseInt(idx)] ?? '').trim() !== val) return false;
    }
    return true;
  });

  updateBody(filtered);
  rowCount.textContent = `${filtered.length} of ${dataRows.length} row${dataRows.length !== 1 ? 's' : ''}`;
}

function rebuildTable() {
  const container = document.getElementById('sheet-container');
  container.innerHTML = '';
  container.appendChild(buildTable(allRows[0], allRows.slice(1)));
  applyFilter();
}

function toggleAddForm() {
  const existing = document.getElementById('add-form');
  const btn = document.getElementById('add-btn');
  if (existing) {
    existing.remove();
    btn.textContent = '+ Add Entry';
  } else {
    showAddForm();
    btn.textContent = '✕ Cancel';
  }
}

function showAddForm() {
  if (!allRows.length) return;
  const headers = allRows[0];
  const inputs = [];

  const form = document.createElement('form');
  form.id = 'add-form';
  form.className = 'add-form';

  const grid = document.createElement('div');
  grid.className = 'form-grid';

  headers.forEach(header => {
    const wrapper = document.createElement('div');
    wrapper.className = 'form-field';

    const label = document.createElement('label');
    label.textContent = header;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Enter ${header}…`;
    inputs.push(input);

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    grid.appendChild(wrapper);
  });

  form.appendChild(grid);

  const actions = document.createElement('div');
  actions.className = 'form-actions';

  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Add Entry';
  submitBtn.className = 'btn-primary';
  actions.appendChild(submitBtn);
  form.appendChild(actions);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const rowData = inputs.map(inp => inp.value);
    await submitEntry(rowData);
  });

  const container = document.getElementById('sheet-container');
  container.parentNode.insertBefore(form, container);
  inputs[0] && inputs[0].focus();
}

async function submitEntry(rowData) {
  allRows.push(rowData);

  const form = document.getElementById('add-form');
  if (form) form.remove();
  document.getElementById('add-btn').textContent = '+ Add Entry';

  rebuildTable();

  if (APPS_SCRIPT_URL) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify({ row: rowData }),
      });
    } catch (err) {
      console.error('Could not save to sheet:', err);
    }
  }
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
    allRows = rows;
    status.remove();

    container.appendChild(buildTable(rows[0], rows.slice(1)));
    document.getElementById('search-input').addEventListener('input', applyFilter);
    applyFilter();
  } catch (err) {
    status.textContent = `Could not load data: ${err.message}`;
    status.classList.add('error');
  }
}

document.getElementById('add-btn').addEventListener('click', toggleAddForm);
loadSheet();
