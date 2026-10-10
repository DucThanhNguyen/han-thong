/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2022 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
 */

/* global globalThis */

'use strict';

// shown in the notes column of words without notes
const NOTES_PLACEHOLDER = 'Thêm ghi chú';

const table = document.getElementById('words');
const tbody = table.querySelector('tbody');
const search = document.getElementById('search');
const dialog = document.getElementById('editNotes');

let entries = [];

let showZhuyin = globalThis.defaultConfig.zhuyin;

// entries selected by clicking on their rows
let selected = new Set();

let sortKey = 'id';

let sortDir = 'asc';

// entry whose notes are being edited
let editing = null;

// migration from manifest v2
chrome.storage.local.get(['wordList', '_wl_migrated'], data => {
    if (!data._wl_migrated) {

        let v2wordlist = localStorage['wordlist'];
        let migrated = v2wordlist ? JSON.parse(v2wordlist) : [];

        if (data.wordList) {
            migrated.push(...data.wordList);
        }
        chrome.storage.local.set({wordList: migrated, _wl_migrated: true}, () => console.log('Đã chuyển đổi danh sách từ vựng'));
    }
});

chrome.storage.local.get(['wordList', 'zhuyin'], data => {
    showZhuyin = data.zhuyin ?? globalThis.defaultConfig.zhuyin;

    entries = data.wordList || [];
    entries.forEach(e => {
        e.timestamp = e.timestamp || 0;
        e.notes = e.notes || '';
        e.zhuyin = convert2Zhuyin(e.pinyin);
    });
    // show new entries first
    entries.sort((e1, e2) => e2.timestamp - e1.timestamp);
    entries.forEach((e, i) => e.id = i);

    table.querySelector('th[data-key="zhuyin"]').hidden = !showZhuyin;
    render();
});

function columns() {
    let keys = ['id', 'simplified', 'traditional', 'pinyin', 'zhuyin', 'definition', 'notes'];
    return showZhuyin ? keys : keys.filter(k => k !== 'zhuyin');
}

function convert2Zhuyin(pinyin) {
    let zhuyin = [];
    let a = pinyin.split(/[\s·]+/);
    for (let i = 0; i < a.length; i++) {
        let syllable = a[i];
        zhuyin.push(globalThis.accentedPinyin2Zhuyin(syllable));
    }
    return zhuyin.join(' ');
}

// entries matching the search box, in the current sort order
function visibleEntries() {
    let query = search.value.trim().toLowerCase();
    let list = entries.filter(e => !query ||
        columns().some(key => String(e[key]).toLowerCase().includes(query)));

    let direction = sortDir === 'asc' ? 1 : -1;
    list.sort((e1, e2) => {
        let v1 = e1[sortKey];
        let v2 = e2[sortKey];
        let order = (typeof v1 === 'number') ? v1 - v2 : String(v1).localeCompare(String(v2), 'vi');
        return order * direction;
    });
    return list;
}

function render() {
    let list = visibleEntries();

    tbody.textContent = '';
    for (let entry of list) {
        let row = tbody.insertRow();
        row.entry = entry;
        if (selected.has(entry)) {
            row.classList.add('bg-info');
        }
        for (let key of columns()) {
            let cell = row.insertCell();
            cell.dataset.key = key;
            if (key === 'notes' && !entry.notes) {
                cell.textContent = NOTES_PLACEHOLDER;
                cell.classList.add('notes-empty');
            } else {
                cell.textContent = entry[key];
            }
        }
    }

    table.querySelectorAll('th').forEach(th => {
        if (th.dataset.key === sortKey) {
            th.dataset.sort = sortDir;
        } else {
            delete th.dataset.sort;
        }
    });

    let info = document.getElementById('info');
    if (entries.length === 0) {
        info.textContent = '';
    } else if (list.length === entries.length) {
        info.textContent = `Tổng số ${entries.length} từ`;
    } else {
        info.textContent = `Tìm thấy ${list.length} trong tổng số ${entries.length} từ`;
    }

    let empty = entries.length === 0;
    document.getElementById('nodata').hidden = !empty;
    table.hidden = empty;
    ['saveList', 'selectAll', 'deselectAll', 'delete'].forEach(id =>
        document.getElementById(id).disabled = empty);
}

function copyEntryForSaving(entry) {
    let result = Object.assign({}, entry);
    // don't save these atributes
    delete result.id;
    delete result.zhuyin;
    if (!result.notes) {
        delete result.notes;
    }
    return result;
}

function saveWordList() {
    chrome.storage.local.set({wordList: entries.map(copyEntryForSaving)});
}

table.querySelector('thead').addEventListener('click', event => {
    let th = event.target.closest('th');
    if (!th) {
        return;
    }
    if (sortKey === th.dataset.key) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortKey = th.dataset.key;
        sortDir = 'asc';
    }
    render();
});

tbody.addEventListener('click', event => {
    let row = event.target.closest('tr');
    if (!row) {
        return;
    }
    let entry = row.entry;

    if (event.target.closest('td').dataset.key === 'notes') {
        editing = entry;
        document.getElementById('simplified').value = entry.simplified;
        document.getElementById('traditional').value = entry.traditional;
        document.getElementById('definition').value = entry.definition;
        document.getElementById('notes').value = entry.notes;
        // closing with Esc keeps the previous returnValue
        dialog.returnValue = '';
        dialog.showModal();
    } else {
        if (selected.has(entry)) {
            selected.delete(entry);
        } else {
            selected.add(entry);
        }
        row.classList.toggle('bg-info');
    }
});

dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'save' && editing) {
        editing.notes = document.getElementById('notes').value;
        saveWordList();
        render();
    }
    editing = null;
});

search.addEventListener('input', render);

document.getElementById('saveList').addEventListener('click', () => {
    let rows = visibleEntries().filter(e => selected.has(e));

    if (rows.length === 0) {
        return;
    }

    let content = '';
    for (let entry of rows) {
        content += entry.simplified;
        content += '\t';
        content += entry.traditional;
        content += '\t';
        content += entry.pinyin;
        content += '\t';
        if (showZhuyin) {
            content += entry.zhuyin;
            content += '\t';
        }
        content += entry.definition;
        content += '\t';
        content += entry.notes.replace(/[\r\n]/gm, ' ');
        content += '\r\n';
    }

    let saveBlob = new Blob([content], { 'type': 'text/plain' });
    let a = document.getElementById('savelink');
    a.href = URL.createObjectURL(saveBlob);
    a.click();
});

document.getElementById('delete').addEventListener('click', () => {
    entries = entries.filter(e => !selected.has(e));
    selected.clear();
    saveWordList();
    render();
});

document.getElementById('selectAll').addEventListener('click', () => {
    visibleEntries().forEach(e => selected.add(e));
    render();
});

document.getElementById('deselectAll').addEventListener('click', () => {
    selected.clear();
    render();
});
