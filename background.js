/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2023 Christian Schiller
 https://chrome.google.com/extensions/detail/kkmlkkjojmombglmlpbpapmhcaljjkde

 ---

 Originally based on Rikaikun 0.8
 Copyright (C) 2010 Erek Speed
 http://code.google.com/p/rikaikun/

 ---

 Originally based on Rikaichan 1.07
 by Jonathan Zarate
 http://www.polarcloud.com/

 ---

 Originally based on RikaiXUL 0.4 by Todd Rudick
 http://www.rikai.com/
 http://rikaixul.mozdev.org/

 ---

 This program is free software; you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation; either version 2 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA

 ---

 Please do not change or remove any of the copyrights or links to web pages
 when modifying any of the files.

 */

/* global globalThis */

'use strict';

import { ZhongwenDictionary } from './dict.js';
import './js/config.js';

let dict;

chrome.runtime.onInstalled.addListener(() => {

    // options stored by earlier versions: background colours and font sizes
    // that are no longer offered
    chrome.storage.local.get(Object.keys(globalThis.legacyOptions), stored => {
        let changes = {};
        for (let [option, values] of Object.entries(globalThis.legacyOptions)) {
            if (stored[option] in values) {
                changes[option] = values[stored[option]];
            }
        }
        chrome.storage.local.set(changes);
    });

    chrome.contextMenus.create(
        {
            id: 'wordlistMenuItem',
            title: 'Mở danh sách từ vựng'
        }, () => {
            if (chrome.runtime.lastError) {
                // ignore
            }
        }
    );

    chrome.contextMenus.create(
        {
            id: 'helpMenuItem',
            title: 'Xem hướng dẫn trong tab mới'
        }, () => {
            if (chrome.runtime.lastError) {
                // ignore
            }
        }
    );
});

chrome.contextMenus.onClicked.addListener(wordlistMenuItemListener);

chrome.contextMenus.onClicked.addListener(helpMenuItemListener);

function wordlistMenuItemListener({menuItemId}) {

    chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
        if (menuItemId === 'wordlistMenuItem') {
            let url = '/wordlist.html';
            let tabID = tabIDs['wordlist'];
            if (tabID) {
                chrome.tabs.get(tabID, function (tab) {
                    if (!chrome.runtime.lastError && tab && tab.url && (tab.url.endsWith('wordlist.html'))) {
                        chrome.tabs.update(tabID, {
                            active: true
                        });
                    } else {
                        chrome.tabs.create({
                            url: url
                        }, function (tab) {
                            tabIDs['wordlist'] = tab.id;
                            chrome.storage.session.set({tabIDs});
                        });
                    }
                });
            } else {
                chrome.tabs.create(
                    {url: url},
                    function (tab) {
                        tabIDs['wordlist'] = tab.id;
                        chrome.storage.session.set({tabIDs});
                    }
                );
            }
        }
    });
}

function helpMenuItemListener({menuItemId}) {

    chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
        if (menuItemId === 'helpMenuItem') {
            let url = '/help.html';
            let tabID = tabIDs['help'];
            if (tabID) {
                chrome.tabs.get(tabID, function (tab) {
                    if (!chrome.runtime.lastError && tab && (tab.url.endsWith('help.html'))) {
                        chrome.tabs.update(tabID, {
                            active: true
                        });
                    } else {
                        chrome.tabs.create({
                            url: url
                        }, function (tab) {
                            tabIDs['help'] = tab.id;
                            chrome.storage.session.set({tabIDs});
                        });
                    }
                });
            } else {
                chrome.tabs.create(
                    {url: url},
                    function (tab) {
                        tabIDs['help'] = tab.id;
                        chrome.storage.session.set({tabIDs});
                    }
                );
            }
        }
    });
}

chrome.action.onClicked.addListener(activateExtensionToggle);

function activateExtensionToggle(currentTab) {
    chrome.storage.local.get('isActive', ({isActive}) => {
        isActive ? deactivateExtension() : activateExtension(currentTab.id);
    });
}

function activateExtension(tabId) {

    chrome.storage.local.set({isActive: true});

    showActiveBadge();

    ensureContentScripts(tabId).then(() => {
        enableTab(tabId);
        showHelpMenu(tabId);
    });
}

// Tabs opened before the extension was installed or reloaded have no content
// script yet: inject it instead of requiring the user to reload the page.
async function ensureContentScripts(tabId) {
    try {
        if (await chrome.tabs.sendMessage(tabId, {'type': 'ping'})) {
            return;
        }
    } catch (e) {
        // no content script in this tab
    }

    let {js, css} = chrome.runtime.getManifest().content_scripts[0];
    try {
        await chrome.scripting.insertCSS({target: {tabId, allFrames: true}, files: css});
        await chrome.scripting.executeScript({target: {tabId, allFrames: true}, files: js});
    } catch (e) {
        // pages where extensions cannot run, e.g. chrome:// and the Chrome Web Store
    }
}

function enableTab(tabId) {
    chrome.tabs.getZoom(tabId, zoomFactor => {
        chrome.tabs.sendMessage(tabId, {
            'type': 'enable',
            'zoomFactor': chrome.runtime.lastError ? 1 : zoomFactor
        }, () => {
            if (chrome.runtime.lastError) {
                // ignore
            }
        });
    });
}

// The popup keeps the same size at any page zoom: tell the content script the
// tab's zoom so that it can scale the popup back.
chrome.tabs.onZoomChange.addListener(({tabId, newZoomFactor}) => {
    chrome.tabs.sendMessage(tabId, {
        'type': 'zoom',
        'zoomFactor': newZoomFactor
    }, () => {
        if (chrome.runtime.lastError) {
            // ignore
        }
    });
});

function showActiveBadge() {
    chrome.action.setBadgeBackgroundColor({
        'color': [30, 142, 62, 255]
    });

    chrome.action.setBadgeText({
        'text': 'Bật'
    });
}

function showHelpMenu(tabId) {
    chrome.tabs.sendMessage(tabId, {
        'type': 'showHelp'
    }, () => {
        if (chrome.runtime.lastError) {
            // ignore
        }
    });
}

function deactivateExtension() {

    chrome.storage.local.set({isActive: false});

    dict = undefined;

    showInactiveBadge();

    disableAllTabs();
}

function showInactiveBadge() {
    chrome.action.setBadgeBackgroundColor({
        'color': [0, 0, 0, 0]
    });

    chrome.action.setBadgeText({
        'text': ''
    });
}

function disableAllTabs() {
    chrome.windows.getAll(
        { 'populate': true },
        function (windows) {
            for (let i = 0; i < windows.length; ++i) {
                let tabs = windows[i].tabs;
                for (let j = 0; j < tabs.length; ++j) {
                    chrome.tabs.sendMessage(tabs[j].id, {
                        'type': 'disable'
                    }, () => {
                        if (chrome.runtime.lastError) {
                            // ignore
                        }
                    });
                }
            }
        }
    );
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if (message.type === 'search') {

        search(message.text).then(response => {
            sendResponse(response);
        });

        return true;
    }
});

function search(text) {

    if (!dict) {
        return loadDictionary().then(d => {

            dict = d;

            return lookup(dict, text);

        });
    } else {
        let entry = lookup(dict, text);

        return Promise.resolve(entry);
    }
}

async function loadDictionary() {
    let [wordDict, wordIndex, taiwan] = await Promise.all([
        fetch(chrome.runtime.getURL('data/dict.u8')).then(r => r.text()),
        fetch(chrome.runtime.getURL('data/dict.idx')).then(r => r.text()),
        fetch(chrome.runtime.getURL('data/taiwan.tsv')).then(r => r.text())
    ]);
    return new ZhongwenDictionary(wordDict, wordIndex, taiwan);
}

function lookup(dictionary, text) {

    let entry = dictionary.wordSearch(text);

    if (entry) {
        entry.chars = dictionary.charEntries(entry);
        entry.data = ZhongwenDictionary.mainEntries(entry);
        entry.taiwan = dictionary.taiwanReadings(
            entry.data.map(d => d[0]).concat(...entry.chars.map(c => c.lines)));
    }

    return entry;
}

chrome.tabs.onActivated.addListener(activeInfo => {

    chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
        if (activeInfo.tabId === tabIDs['wordlist']) {
            chrome.tabs.reload(activeInfo.tabId);
        } else if (activeInfo.tabId !== tabIDs['help']) {
            enableTabIfActive(activeInfo.tabId);
        }
    });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {

    chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
        if (changeInfo.status === 'complete' && tabId !== tabIDs['help'] && tabId !== tabIDs['wordlist']) {
            enableTabIfActive(tabId);
        }
    });
});


function enableTabIfActive(tabId) {

    chrome.storage.local.get('isActive', ({isActive}) => {
        if (isActive) {
            enableTab(tabId);
            showActiveBadge();
        }
    });
}

chrome.runtime.onMessage.addListener(function (message) {

    if (message.type === 'open') {
        chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
            let tabID = tabIDs[message.tabType];
            if (tabID) {
                chrome.tabs.get(tabID, () => {
                    if (!chrome.runtime.lastError) {
                        // activate existing tab
                        chrome.tabs.update(tabID, {active: true, url: message.url});
                    } else {
                        createTab(message.url, message.tabType);
                    }
                });
            } else {
                createTab(message.url, message.tabType);
            }
        });
    }
});

function createTab(url, tabType) {

    chrome.storage.session.get('tabIDs', ({tabIDs = {}}) => {
        chrome.tabs.create({url}, tab => {
            tabIDs[tabType] = tab.id;
            chrome.storage.session.set({tabIDs});
        });
    });
}

chrome.runtime.onMessage.addListener(function (message) {

    if (message.type === 'add') {
        chrome.storage.local.get(['wordList', 'saveToWordList'], data => {

            let wordList = data.wordList || [];

            let saveToWordList = data.saveToWordList || globalThis.defaultConfig.saveToWordList;

            for (let i in message.entries) {

                let entry = {};
                entry.timestamp = Date.now();
                entry.simplified = message.entries[i].simplified;
                entry.traditional = message.entries[i].traditional;
                entry.pinyin = message.entries[i].pinyin;
                entry.definition = message.entries[i].definition;

                wordList.push(entry);

                if (saveToWordList === 'firstEntryOnly') {
                    break;
                }
            }

            chrome.storage.local.set({wordList});
        });
    }
});

