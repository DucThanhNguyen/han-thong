/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2022 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
 */

/* global globalThis */

'use strict';

// a copy: the defaults are needed again by "Khôi phục mặc định"
const defaults = {...globalThis.defaultConfig};
const optionNames = Object.keys(defaults);

let config = {...defaults};

// options shown as radio buttons (value attribute) and as switches
const radioOptions = ['background', 'hanziColor', 'hanziFont', 'maxSenses', 'popupKey', 'saveToWordList', 'simpTrad'];
const checkboxOptions = ['showPinyin', 'zhuyin', 'showHanViet', 'toneColors'];

chrome.storage.local.get(optionNames, storedConfig => {
    Object.assign(config, storedConfig);
    loadVals();
});

// changes made elsewhere, e.g. in another options tab
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    let changed = false;
    Object.entries(changes).forEach(([option, change]) => {
        if (option in defaults) {
            config[option] = 'newValue' in change ? change.newValue : defaults[option];
            changed = true;
        }
    });
    if (changed) {
        loadVals();
    }
});

// the value as the page shows it, also for values stored by earlier versions
function shownValue(option) {
    switch (option) {
        case 'background':
            return globalThis.legacyOptions.background[config.background] || config.background;
        case 'fontSize':
            return globalThis.hanziSize(config);
        default:
            return config[option];
    }
}

function loadVals() {
    radioOptions.forEach(option => {
        let input = document.querySelector(`input[name="${option}"][value="${shownValue(option)}"]`);
        if (input) {
            input.checked = true;
        }
    });

    checkboxOptions.forEach(option => {
        document.querySelector(`#${option}`).checked = config[option];
    });

    showFontSize(shownValue('fontSize'));

    document.querySelector('#reset').disabled = optionNames.every(option => shownValue(option) === defaults[option]);
}

function showFontSize(size) {
    let fontSize = document.querySelector('#fontSize');
    fontSize.value = size;
    fontSize.style.setProperty('--fill', (size - fontSize.min) / (fontSize.max - fontSize.min) * 100 + '%');
    document.querySelector('#fontSizeValue').textContent = size + ' px';
}

// radio values are strings, stored options keep the type of their default value
function parseValue(option, value) {
    switch (typeof defaults[option]) {
        case 'boolean':
            return value === 'true';
        case 'number':
            return Number(value);
        default:
            return value;
    }
}

function setOptions(values) {
    Object.assign(config, values);
    chrome.storage.local.set(values);
    loadVals();
}

// back to the defaults, with a way back for a few seconds
function resetAll() {
    let before = {};
    optionNames.forEach(option => before[option] = config[option]);
    setOptions(defaults);
    showToast('Đã đưa tùy chọn về mặc định.', 'Hoàn tác', () => setOptions(before));
}

let toastTimer;

function showToast(text, actionLabel, action) {
    let toast = document.querySelector('#toast');
    let button = document.querySelector('#toastAction');
    document.querySelector('#toastText').textContent = text;
    button.textContent = actionLabel;
    button.onclick = () => {
        action();
        toast.hidden = true;
    };
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.hidden = true, 6000);
}

let fontSize = document.querySelector('#fontSize');
fontSize.min = globalThis.fontSizes.min;
fontSize.max = globalThis.fontSizes.max;
fontSize.step = globalThis.fontSizes.step;
fontSize.addEventListener('input', () => showFontSize(Number(fontSize.value)));
fontSize.addEventListener('change', () => setOptions({fontSize: Number(fontSize.value)}));

radioOptions.forEach(option => {
    document.querySelectorAll(`input[name="${option}"]`).forEach(input => {
        input.addEventListener('change',
            () => setOptions({[option]: parseValue(option, input.value)}));
    });
});

checkboxOptions.forEach(option => {
    document.querySelector(`#${option}`).addEventListener('change',
        event => setOptions({[option]: event.target.checked}));
});

document.querySelector('#reset').addEventListener('click', resetAll);

loadVals();
