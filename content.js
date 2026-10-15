/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2010-2023 Christian Schiller
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

let config = globalThis.defaultConfig;

chrome.storage.local.get(null, storedConfig => {
    if (storedConfig) {
        Object.entries(storedConfig).forEach(e => config[e[0]] = e[1]);
    }
});

chrome.storage.onChanged.addListener((changes, areaName) => {

    if (areaName !== 'local') return;

    // format: {"background":{"newValue":"lightblue","oldValue":"blue"}, "toneColors":{"newValue":false,"oldValue":true}}
    Object.entries(changes).forEach(e => config[e[0]] = e[1].newValue);
});

let savedTarget;

let savedRangeNode;

let savedRangeOffset;

let selText;

let clientX;

let clientY;

let selStartDelta;

let selStartIncrement;

let popX = 0;

let popY = 0;

let timer;

let altView = 0;

let savedSearchResults = [];

let savedSelStartOffset = 0;

let savedSelEndList = [];

// last mouse position, to look up the word under the mouse when the popup key
// is pressed without moving the mouse
let lastMouseMove = null;

// Chrome's zoom factor for this tab; the popup is scaled by its inverse so
// that it keeps the same size at any page zoom
let zoomFactor = 1;

function enableTab() {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('keydown', onKeyDown);
}

function disableTab() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('keydown', onKeyDown);

    let popup = document.getElementById('zhongwen-window');
    if (popup) {
        popup.parentNode.removeChild(popup);
    }

    clearHighlight();
}

function onKeyDown(keyDown) {

    if (isPopupKey(keyDown)) {
        // look up the word under the mouse without waiting for a mouse move
        if (lastMouseMove && !keyDown.repeat && !isEditable(keyDown.target)) {
            clientX = clientY = null;
            savedTarget = null;
            onMouseMove(lastMouseMove, true);
        }
        return;
    }

    if (keyDown.ctrlKey || keyDown.metaKey) {
        return;
    }

    if (keyDown.keyCode === 27) {
        // esc key pressed
        hidePopup();
        return;
    }

    if (keyDown.altKey && keyDown.keyCode === 87) {
        // Alt + w
        chrome.runtime.sendMessage({
            type: 'open',
            tabType: 'wordlist',
            url: '/wordlist.html'
        });
        return;
    }

    if (!isVisible()) {
        return;
    }

    switch (keyDown.keyCode) {

        case 65: // 'a'
            altView = (altView + 1) % 3;
            triggerSearch();
            break;

        case 67: // 'c'
            copyToClipboard(getTextForClipboard());
            break;

        case 66: // 'b'
        {
            let offset = selStartDelta;
            for (let i = 0; i < 10; i++) {
                selStartDelta = --offset;
                let ret = triggerSearch();
                if (ret === 0) {
                    break;
                } else if (ret === 2) {
                    savedRangeNode = findPreviousTextNode(savedRangeNode.parentNode, savedRangeNode);
                    savedRangeOffset = 0;
                    offset = savedRangeNode.data.length;
                }
            }
        }
            break;

        case 77: // 'm'
            selStartIncrement = 1;
        // falls through
        case 78: // 'n'
            for (let i = 0; i < 10; i++) {
                selStartDelta += selStartIncrement;
                let ret = triggerSearch();
                if (ret === 0) {
                    break;
                } else if (ret === 2) {
                    savedRangeNode = findNextTextNode(savedRangeNode.parentNode, savedRangeNode);
                    savedRangeOffset = 0;
                    selStartDelta = 0;
                    selStartIncrement = 0;
                }
            }
            break;

        case 82: // 'r'
        {
            let entries = [];
            for (let j = 0; j < savedSearchResults.length; j++) {
                let entry = {
                    simplified: savedSearchResults[j][0],
                    traditional: savedSearchResults[j][1],
                    pinyin: savedSearchResults[j][2],
                    definition: savedSearchResults[j][3]
                };
                entries.push(entry);
            }

            chrome.runtime.sendMessage({
                'type': 'add',
                'entries': entries
            });

            showPopup('Đã thêm vào danh sách từ vựng.<p>Nhấn Alt+W để mở danh sách.', null, -1, -1);
        }
            break;

        case 88: // 'x'
            altView = 0;
            popY -= 20;
            triggerSearch();
            break;

        case 89: // 'y'
            altView = 0;
            popY += 20;
            triggerSearch();
            break;

        default:
            return;
    }
}

// With the "popupKey" option, words are looked up only while that key is held
function isPopupKeyHeld(event) {
    switch (config.popupKey) {
        case 'shift':
            return event.shiftKey;
        case 'ctrl':
            return event.ctrlKey;
        case 'alt':
            return event.altKey;
        default:
            return true;
    }
}

function isPopupKey(keyDown) {
    return {shift: 'Shift', ctrl: 'Control', alt: 'Alt'}[config.popupKey] === keyDown.key;
}

function isEditable(elem) {
    return elem.nodeName === 'INPUT' || elem.nodeName === 'TEXTAREA' || elem.isContentEditable;
}

function onMouseMove(mouseMove, keyHeld = isPopupKeyHeld(mouseMove)) {
    // the mouse is on the popup: keep it open to read it, and don't look up
    // the popup's own text or the page under it
    let popup = document.getElementById('zhongwen-window');
    if (popup && popup.contains(mouseMove.target)) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        return;
    }

    if (mouseMove.target.nodeName === 'TEXTAREA' || mouseMove.target.nodeName === 'INPUT'
        || mouseMove.target.nodeName === 'DIV') {

        let div = document.getElementById('zhongwenDiv');

        if (mouseMove.altKey) {

            if (!div && (mouseMove.target.nodeName === 'TEXTAREA' || mouseMove.target.nodeName === 'INPUT')) {

                div = makeDiv(mouseMove.target);
                document.body.appendChild(div);
                div.scrollTop = mouseMove.target.scrollTop;
                div.scrollLeft = mouseMove.target.scrollLeft;
            }
        } else {
            if (div) {
                document.body.removeChild(div);
            }
        }
    }

    if (clientX && clientY) {
        if (mouseMove.clientX === clientX && mouseMove.clientY === clientY) {
            return;
        }
    }
    clientX = mouseMove.clientX;
    clientY = mouseMove.clientY;

    lastMouseMove = {
        target: mouseMove.target,
        clientX: mouseMove.clientX,
        clientY: mouseMove.clientY,
        altKey: mouseMove.altKey
    };

    if (!keyHeld) {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        savedTarget = null;
        savedRangeNode = null;
        hidePopupIfMovedAway(mouseMove);
        return;
    }

    let range;
    let rangeNode;
    let rangeOffset;

    // Handle Chrome and Firefox
    if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(mouseMove.clientX, mouseMove.clientY);
        if (range === null) {
            return;
        }
        rangeNode = range.startContainer;
        rangeOffset = range.startOffset;
    } else if (document.caretPositionFromPoint) {
        range = document.caretPositionFromPoint(mouseMove.clientX, mouseMove.clientY);
        if (range === null) {
            return;
        }
        rangeNode = range.offsetNode;
        rangeOffset = range.offset;
    }

    if (mouseMove.target === savedTarget) {
        if (rangeNode === savedRangeNode && rangeOffset === savedRangeOffset) {
            return;
        }
    }

    if (timer) {
        clearTimeout(timer);
        timer = null;
    }

    if (rangeNode.data && rangeOffset === rangeNode.data.length) {
        rangeNode = findNextTextNode(rangeNode.parentNode, rangeNode);
        rangeOffset = 0;
    }

    if (!rangeNode || rangeNode.parentNode !== mouseMove.target) {
        rangeNode = null;
        rangeOffset = -1;
    }

    savedTarget = mouseMove.target;
    savedRangeNode = rangeNode;
    savedRangeOffset = rangeOffset;

    selStartDelta = 0;
    selStartIncrement = 1;

    if (rangeNode && rangeNode.data && rangeOffset < rangeNode.data.length) {
        popX = mouseMove.clientX;
        popY = mouseMove.clientY;
        timer = setTimeout(() => triggerSearch(), 50);
        return;
    }

    hidePopupIfMovedAway(mouseMove);
}

function hidePopupIfMovedAway(mouseMove) {
    // Don't close just because we moved from a valid pop-up slightly over to a place with nothing.
    let dx = popX - mouseMove.clientX;
    let dy = popY - mouseMove.clientY;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 4) {
        clearHighlight();
        hidePopup();
    }
}

function triggerSearch() {

    let rangeNode = savedRangeNode;
    let selStartOffset = savedRangeOffset + selStartDelta;

    selStartIncrement = 1;

    if (!rangeNode) {
        clearHighlight();
        hidePopup();
        return 1;
    }

    if (selStartOffset < 0 || rangeNode.data.length <= selStartOffset) {
        clearHighlight();
        hidePopup();
        return 2;
    }

    let u = rangeNode.data.charCodeAt(selStartOffset);

    let isChineseCharacter = !isNaN(u) && (
        u === 0x25CB ||
        (0x3400 <= u && u <= 0x9FFF) ||
        (0xF900 <= u && u <= 0xFAFF) ||
        (0xFF21 <= u && u <= 0xFF3A) ||
        (0xFF41 <= u && u <= 0xFF5A) ||
        (0xD800 <= u && u <= 0xDFFF)
    );

    if (!isChineseCharacter) {
        clearHighlight();
        hidePopup();
        return 3;
    }

    let selEndList = [];
    let text = getText(rangeNode, selStartOffset, selEndList, 30 /*maxlength*/);

    savedSelStartOffset = selStartOffset;
    savedSelEndList = selEndList;

    chrome.runtime.sendMessage({
            'type': 'search',
            'text': text
        },
        processSearchResult
    );

    return 0;
}

function processSearchResult(result) {

    let selStartOffset = savedSelStartOffset;
    let selEndList = savedSelEndList;

    if (!result) {
        hidePopup();
        clearHighlight();
        return;
    }

    selStartIncrement = result.matchLen;
    selStartDelta = (selStartOffset - savedRangeOffset);

    let rangeNode = savedRangeNode;
    // don't try to highlight form elements
    if (!('form' in savedTarget)) {
        let doc = rangeNode.ownerDocument;
        if (!doc) {
            clearHighlight();
            hidePopup();
            return;
        }
        highlightMatch(doc, rangeNode, selStartOffset, result.matchLen, selEndList);
    }

    showPopup(makeHtml(result, config.toneColors), savedTarget, popX, popY, false);
}

// modifies selEndList as a side-effect
function getText(startNode, offset, selEndList, maxLength) {
    let text = '';
    let endIndex;

    if (startNode.nodeType !== Node.TEXT_NODE) {
        return '';
    }

    endIndex = Math.min(startNode.data.length, offset + maxLength);
    text += startNode.data.substring(offset, endIndex);
    selEndList.push({
        node: startNode,
        offset: endIndex
    });

    let nextNode = startNode;
    while ((text.length < maxLength) && ((nextNode = findNextTextNode(nextNode.parentNode, nextNode)) !== null)) {
        text += getTextFromSingleNode(nextNode, selEndList, maxLength - text.length);
    }

    return text;
}

// modifies selEndList as a side-effect
function getTextFromSingleNode(node, selEndList, maxLength) {
    let endIndex;

    if (node.nodeName === '#text') {
        endIndex = Math.min(maxLength, node.data.length);
        selEndList.push({
            node: node,
            offset: endIndex
        });
        return node.data.substring(0, endIndex);
    } else {
        return '';
    }
}

function setZoomFactor(factor) {
    zoomFactor = factor > 0 ? factor : 1;
    let popup = document.getElementById('zhongwen-window');
    if (popup) {
        applyZoom(popup);
    }
}

function applyZoom(popup) {
    popup.style.transformOrigin = '0 0';
    popup.style.transform = zoomFactor === 1 ? '' : `scale(${1 / zoomFactor})`;
}

function showPopup(html, elem, x, y, looseWidth) {

    if (!x || !y) {
        x = y = 0;
    }

    let popup = document.getElementById('zhongwen-window');

    if (!popup) {
        popup = document.createElement('div');
        popup.setAttribute('id', 'zhongwen-window');
        document.documentElement.appendChild(popup);
    }

    // max-content: the width must not depend on the space left of the
    // position, which is too small once the popup is scaled for the page zoom
    popup.style.width = 'max-content';
    popup.style.height = 'auto';
    popup.style.maxWidth = (looseWidth ? '' : '600px');
    popup.className = globalThis.popupClassName(config);
    applyZoom(popup);

    popup.innerHTML = html;

    if (elem) {
        popup.style.top = '-1000px';
        popup.style.left = '0px';
        popup.style.display = '';

        // on-screen size, after scaling for the page zoom
        let rect = popup.getBoundingClientRect();
        let pW = rect.width;
        let pH = rect.height;

        if (pW <= 0) {
            pW = 200;
        }
        if (pH <= 0) {
            pH = 0;
            let j = 0;
            while ((j = html.indexOf('<br/>', j)) !== -1) {
                j += 5;
                pH += 22;
            }
            pH += 25;
        }

        if (altView === 1) {
            x = window.scrollX;
            y = window.scrollY;
        } else if (altView === 2) {
            x = (window.innerWidth - (pW + 20)) + window.scrollX;
            y = (window.innerHeight - (pH + 20)) + window.scrollY;
        } else if (elem instanceof window.HTMLOptionElement) {

            x = 0;
            y = 0;

            let p = elem;
            while (p) {
                x += p.offsetLeft;
                y += p.offsetTop;
                p = p.offsetParent;
            }

            if (elem.offsetTop > elem.parentNode.clientHeight) {
                y -= elem.offsetTop;
            }

            if (x + pW > window.innerWidth) {
                // too much to the right, go left
                x -= pW + 5;
                if (x < 0) {
                    x = 0;
                }
            } else {
                // use SELECT's width
                x += elem.parentNode.offsetWidth + 5;
            }
        } else {
            // go left if necessary
            if (x + pW > window.innerWidth - 20) {
                x = (window.innerWidth - pW) - 20;
                if (x < 0) {
                    x = 0;
                }
            }

            // below the mouse
            let v = 25;

            // go up if necessary
            if (y + v + pH > window.innerHeight) {
                let t = y - pH - 30;
                if (t >= 0) {
                    y = t;
                }
            } else  {
                y += v;
            }

            x += window.scrollX;
            y += window.scrollY;
        }
    } else {
        x += window.scrollX;
        y += window.scrollY;
    }

    // (-1, -1) indicates: leave position unchanged
    if (x !== -1 && y !== -1) {
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.display = '';
    }
}

function hidePopup() {
    let popup = document.getElementById('zhongwen-window');
    if (popup) {
        popup.style.display = 'none';
        popup.textContent = '';
    }
}

function highlightMatch(doc, rangeStartNode, rangeStartOffset, matchLen, selEndList) {
    if (!selEndList || selEndList.length === 0) return;

    let selEnd;
    let offset = rangeStartOffset + matchLen;

    for (let i = 0, len = selEndList.length; i < len; i++) {
        selEnd = selEndList[i];
        if (offset <= selEnd.offset) {
            break;
        }
        offset -= selEnd.offset;
    }

    let range = doc.createRange();
    range.setStart(rangeStartNode, rangeStartOffset);
    range.setEnd(selEnd.node, offset);

    let sel = window.getSelection();
    if (!sel.isCollapsed && selText !== sel.toString())
        return;
    sel.empty();
    sel.addRange(range);
    selText = sel.toString();
}

function clearHighlight() {

    if (selText === null) {
        return;
    }

    let selection = window.getSelection();
    if (selection.isCollapsed || selText === selection.toString()) {
        selection.empty();
    }
    selText = null;
}

function isVisible() {
    let popup = document.getElementById('zhongwen-window');
    return popup && popup.style.display !== 'none';
}

function getTextForClipboard() {
    let result = '';
    for (let i = 0; i < savedSearchResults.length; i++) {
        let [simp, trad, pinyin, translation, hanViet] = savedSearchResults[i];
        result += [simp, trad, pinyin, hanViet, translation].join('\t');
        result += '\n';
    }
    return result;
}

function makeDiv(input) {
    let div = document.createElement('div');

    div.id = 'zhongwenDiv';

    let text;
    if (input.value) {
        text = input.value;
    } else {
        text = '';
    }
    div.innerText = text;

    div.style.cssText = window.getComputedStyle(input, '').cssText;
    div.scrollTop = input.scrollTop;
    div.scrollLeft = input.scrollLeft;
    div.style.position = 'absolute';
    div.style.zIndex = 7000;
    let rect = input.getBoundingClientRect();
    div.style.top = (rect.top + window.scrollY) + 'px';
    div.style.left = (rect.left + window.scrollX) + 'px';

    return div;
}

function findNextTextNode(root, previous) {
    if (root === null) {
        return null;
    }
    let nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, null);
    let node = nodeIterator.nextNode();
    while (node !== previous) {
        node = nodeIterator.nextNode();
        if (node === null) {
            return findNextTextNode(root.parentNode, previous);
        }
    }
    let result = nodeIterator.nextNode();
    if (result !== null) {
        return result;
    } else {
        return findNextTextNode(root.parentNode, previous);
    }
}

function findPreviousTextNode(root, previous) {
    if (root === null) {
        return null;
    }
    let nodeIterator = document.createNodeIterator(root, NodeFilter.SHOW_TEXT, null);
    let node = nodeIterator.nextNode();
    while (node !== previous) {
        node = nodeIterator.nextNode();
        if (node === null) {
            return findPreviousTextNode(root.parentNode, previous);
        }
    }
    nodeIterator.previousNode();
    let result = nodeIterator.previousNode();
    if (result !== null) {
        return result;
    } else {
        return findPreviousTextNode(root.parentNode, previous);
    }
}

function copyToClipboard(data) {
    navigator.clipboard.writeText(data).then(() => {
        showPopup('Đã sao chép vào clipboard.', null, -1, -1);
    });
}

function makeHtml(result, showToneColors) {

    let html = '';
    let texts = [];

    if (result === null) return '';

    let classes = 'ht-results';
    if (config.hanziFont === 'kai') {
        classes += ' ht-kai';
    }
    html += '<div class="' + classes + '" style="--hz: ' + globalThis.hanziSize(config) + 'px">';

    for (let i = 0; i < result.data.length; ++i) {
        // 修煉 修炼 [xiu1 lian4] {tu luyện} /nghĩa 1/nghĩa 2/
        let entry = result.data[i][0].match(/^(\S+)\s+(\S+)\s+\[(.*?)\](?:\s+\{(.*?)\})?\s*\/(.*)\//);
        if (!entry) continue;

        let [, trad, simp, numericPinyin, hanViet, def] = entry;

        // Hanzi

        let word = simp;
        let otherWord = '';
        if (config.simpTrad === 'auto') {
            word = result.data[i][1];
        } else if (trad !== simp) {
            otherWord = trad;
        }

        if (i > 0) {
            html += '<div class="ht-sep"></div>';
        }

        let w = makeWordHtml(word, numericPinyin, hanViet, showToneColors);
        html += '<div class="ht-word">' + w.html + '</div>';

        // Definition

        // references to other words in the same character style as the word shown
        let useTraditional = word === trad && trad !== simp;
        let senses = def === '' ? [] : def.split('/').map(sense => formatSense(sense, useTraditional));
        let meanings = senses.filter(sense => !sense.classifiers).map(sense => sense.text);
        let classifiers = senses.filter(sense => sense.classifiers).map(sense => sense.classifiers);

        let maxSenses = Number(config.maxSenses);
        let shown = meanings.slice(0, maxSenses > 0 ? maxSenses : meanings.length);

        html += '<div class="ht-def">';
        if (otherWord) {
            html += '<div class="ht-other">' + otherWord + '</div>';
        }
        if (shown.length > 0) {
            html += '<div class="ht-mean">' + shown.map(escapeHtml).join(' ◆ ') +
                (shown.length < meanings.length ? ' ◆ &hellip;' : '') + '</div>';
        }
        if (classifiers.length > 0) {
            html += '<div class="ht-cl">Lượng từ: ' + escapeHtml(classifiers.join(', ')) + '</div>';
        }
        if (senses.length === 0) {
            // no Vietnamese meaning yet: fall back to the Hán-Việt reading,
            // unless some characters have none ('_')
            if (w.hanViet && !hanViet.split(' ').includes('_')) {
                html += '<div class="ht-mean">' + escapeHtml(w.hanViet) + '</div>';
            } else {
                html += '<div class="ht-nodef">Chưa có nghĩa tiếng Việt</div>';
            }
        }

        html += '</div>';

        let translation = meanings
            .concat(classifiers.length > 0 ? ['lượng từ: ' + classifiers.join(', ')] : [])
            .join(' ◆ ');

        texts[i] = [simp, trad, w.pinyin, translation, w.hanViet];
    }
    if (result.more) {
        html += '<div class="ht-more">&hellip;</div>';
    }
    html += '</div>';

    savedSearchResults = texts;

    return html;
}

// 'LT:家[jia1],個|个[ge4]' -> {classifiers: '家 jiā, 个 gè'}
// 'xem 開金|开金[kai1 jin1]' -> {text: 'xem 开金 kāi jīn'}
// 'cũng đọc là [pou1]' -> {text: 'cũng đọc là pōu'}
function formatSense(sense, useTraditional) {
    let text = sense.trim().replace(/([\p{Script=Han}A-Za-z0-9·〇]+)(?:\|([\p{Script=Han}A-Za-z0-9·〇]+))?\[([^\]]*)\]/gu,
        (match, first, second, numericPinyin) => {
            let word = (second && !useTraditional) ? second : first;
            let pinyin = numericPinyin.split(/\s+/).map(s => pinyinSyllable(s).text).filter(s => s !== '').join(' ');
            return pinyin ? word + ' ' + pinyin : word;
        })
        // pinyin without characters: 'cũng đọc là [pou1]' -> 'cũng đọc là pōu'
        .replace(/\[((?:[A-Za-z:]+[1-5]\s*)+)\]/g,
            (match, numericPinyin) => numericPinyin.trim().split(/\s+/).map(s => pinyinSyllable(s).text).join(' '));

    let m = text.match(/^(?:LT|lượng từ)\s*:\s*(.*)$/i);
    if (m) {
        return { classifiers: m[1].split(/\s*[,，、]\s*/).filter(s => s !== '').join(', ') };
    }
    return { text: text };
}

function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// One cell per character: pinyin above, zhuyin on the right, Hán-Việt below.
function makeWordHtml(word, numericPinyin, hanViet, showToneColors) {
    let chars = [...word];
    let syllables = numericPinyin.split(/\s+/).filter(s => s !== '');
    let readings = hanViet ? hanViet.split(' ') : [];

    if (chars.length !== syllables.length) {
        // cannot align characters and syllables: show the whole word in one cell
        let parts = syllables.map(pinyinSyllable).filter(p => p.text !== '');
        let pinyinHtml = parts.map(p => (showToneColors && p.tone)
            ? '<span class="tone' + p.tone + '">' + p.html + '</span>'
            : p.html).join(' ');
        return {
            html: makeCellHtml(word, pinyinHtml, '', '', '', ''),
            pinyin: parts.map(p => p.text).join(' '),
            hanViet: ''
        };
    }

    let html = '';
    let pinyin = [];
    let hanVietText = [];
    for (let i = 0; i < chars.length; i++) {
        let p = pinyinSyllable(syllables[i]);
        let toneClass = (showToneColors && p.tone) ? 'tone' + p.tone : '';
        pinyin.push(p.text);

        let reading = (readings[i] && readings[i] !== '_') ? readings[i] : '';
        hanVietText.push(reading);

        html += makeCellHtml(
            chars[i],
            config.showPinyin ? p.html : '',
            config.zhuyin ? zhuyinHtml(syllables[i]) : '',
            config.showHanViet ? reading : '',
            p.tone,
            toneClass
        );
    }

    return {
        html: html,
        pinyin: pinyin.filter(s => s !== '').join(' '),
        hanViet: hanVietText.filter(s => s !== '').join(' ')
    };
}

function makeCellHtml(hanzi, pinyinHtml, zhuyin, hanViet, tone, toneClass) {
    // data-tone: for Han characters in the colour of their tone
    let html = '<span class="ht-cell"' + (tone ? ' data-tone="' + tone + '"' : '') + '>';
    if (config.showPinyin) {
        html += '<span class="ht-py ' + toneClass + '">' + pinyinHtml + '</span>';
    }
    html += '<span class="ht-hz">' + hanzi + '</span>';
    if (zhuyin) {
        html += '<span class="ht-zy ' + toneClass + '">' + zhuyin + '</span>';
    }
    if (config.showHanViet) {
        html += '<span class="ht-hv">' + hanViet + '</span>';
    }
    html += '</span>';
    return html;
}

// 'xiu1' -> {html: 'xiu&#772;', text: 'xiū', tone: '1'}, also handles 'r5', 'A', '·', ...
function pinyinSyllable(syllable) {
    if (syllable === 'r5') {
        return { html: 'r', text: 'r', tone: '5' };
    }
    let m = /[1-5]$/.test(syllable) ? parse(syllable) : null;
    if (!m) {
        // letters, punctuation and other non-pinyin tokens
        let s = /^[A-Za-z]+[1-5]?$/.test(syllable) ? syllable.replace(/[1-5]$/, '') : '';
        return { html: s, text: s, tone: '' };
    }
    let t = tonify(m[2], m[4]);
    return { html: m[1] + t[0] + m[3], text: m[1] + t[1] + m[3], tone: m[4] };
}

// Vertical zhuyin: one letter per line, the tone mark beside the last letter
// (˙ on top), as in the Hán Thông app
function zhuyinHtml(syllable) {
    let parts = /[1-5]$/.test(syllable) ? globalThis.numericPinyin2ZhuyinParts(syllable) : null;
    if (!parts) {
        return '';
    }
    let [symbols, toneMark] = parts;
    let letters = [...symbols];
    let html = '';
    if (toneMark === '˙') {
        html += '<span class="ht-zy-l">˙</span>';
    }
    letters.forEach((letter, i) => {
        html += '<span class="ht-zy-l">' + letter;
        if (i === letters.length - 1 && toneMark && toneMark !== '˙') {
            html += '<span class="ht-zy-t">' + toneMark + '</span>';
        }
        html += '</span>';
    });
    return html;
}

let tones = {
    1: '&#772;',
    2: '&#769;',
    3: '&#780;',
    4: '&#768;',
    5: ''
};

let utones = {
    1: '\u0304',
    2: '\u0301',
    3: '\u030C',
    4: '\u0300',
    5: ''
};

function parse(s) {
    return s.match(/([^AEIOU:aeiou]*)([AEIOUaeiou:]+)([^aeiou:]*)([1-5])/);
}

function tonify(vowels, tone) {
    let html = '';
    let text = '';

    if (vowels === 'ou') {
        html = 'o' + tones[tone] + 'u';
        text = 'o' + utones[tone] + 'u';
    } else {
        let tonified = false;
        for (let i = 0; i < vowels.length; i++) {
            let c = vowels.charAt(i);
            html += c;
            text += c;
            if (c === 'a' || c === 'e') {
                html += tones[tone];
                text += utones[tone];
                tonified = true;
            } else if (i === vowels.length - 1 && !tonified) {
                html += tones[tone];
                text += utones[tone];
                tonified = true;
            }
        }
        html = html.replace(/u:/, '&uuml;');
        text = text.replace(/u:/, '\u00FC');
    }

    return [html, text];
}

let miniHelp = `
    <span style="font-weight: bold;">Hán Thông – Từ điển Trung–Việt</span><br><br>
    <p>Phím tắt:<p>
    <table style="margin: 10px;" cellspacing=5 cellpadding=5>
    <tr><td><b>n&nbsp;:</b></td><td>&nbsp;Từ tiếp theo</td></tr>
    <tr><td><b>b&nbsp;:</b></td><td>&nbsp;Chữ phía trước</td></tr>
    <tr><td><b>m&nbsp;:</b></td><td>&nbsp;Chữ tiếp theo</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>a&nbsp;:</b></td><td>&nbsp;Đổi vị trí cửa sổ tra từ</td></tr>
    <tr><td><b>y&nbsp;:</b></td><td>&nbsp;Dời cửa sổ xuống</td></tr>
    <tr><td><b>x&nbsp;:</b></td><td>&nbsp;Dời cửa sổ lên</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>c&nbsp;:</b></td><td>&nbsp;Sao chép kết quả tra từ</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>r&nbsp;:</b></td><td>&nbsp;Lưu từ vào danh sách từ vựng</td></tr>
    <tr><td><b>&nbsp;</b></td><td>&nbsp;</td></tr>
    <tr><td><b>Alt w&nbsp;:</b></td><td>&nbsp;Mở danh sách từ vựng trong tab mới</td></tr>
    </table>`;

// event listener
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        switch (request.type) {
            case 'ping':
                sendResponse(true);
                break;
            case 'enable':
                if (request.zoomFactor) {
                    setZoomFactor(request.zoomFactor);
                }
                enableTab();
                break;
            case 'zoom':
                setZoomFactor(request.zoomFactor);
                break;
            case 'disable':
                disableTab();
                break;
            case 'showPopup':
                if (!request.isHelp || window === window.top) {
                    showPopup(request.text);
                }
                break;
            case 'showHelp':
                showPopup(miniHelp);
                break;
            default:
        }
    }
);
