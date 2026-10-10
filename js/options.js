/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2022 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde
 */

/* global globalThis */

'use strict';

let config = globalThis.defaultConfig;

// options shown as radio buttons (value attribute) and as checkboxes
const radioOptions = ['background', 'fontSize', 'hanziFont', 'maxSenses', 'saveToWordList', 'simpTrad', 'toneColors'];
const checkboxOptions = ['showPinyin', 'zhuyin', 'showHanViet'];

chrome.storage.local.get(null, storedConfig => {
    if (storedConfig) {
        Object.entries(storedConfig).forEach(e => config[e[0]] = e[1]);
    }

    loadVals();
});

function loadVals() {
    radioOptions.forEach(option => {
        let input = document.querySelector(`input[name="${option}"][value="${config[option]}"]`);
        if (input) {
            input.checked = true;
        }
    });

    checkboxOptions.forEach(option => {
        document.querySelector(`#${option}`).checked = config[option];
    });
}

// radio values are strings, stored options keep the type of their default value
function parseValue(option, value) {
    switch (typeof globalThis.defaultConfig[option]) {
        case 'boolean':
            return value === 'true';
        case 'number':
            return Number(value);
        default:
            return value;
    }
}

function setOption(option, value) {
    chrome.storage.local.set({[option]: value});
}

window.addEventListener('load', () => {
    radioOptions.forEach(option => {
        document.querySelectorAll(`input[name="${option}"]`).forEach(input => {
            input.addEventListener('change',
                () => setOption(option, parseValue(option, input.getAttribute('value'))));
        });
    });

    checkboxOptions.forEach(option => {
        document.querySelector(`#${option}`).addEventListener('change',
            event => setOption(option, event.target.checked));
    });
});
