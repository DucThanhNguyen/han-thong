/*
 Zhongwen - A Chinese-English Pop-Up Dictionary
 Copyright (C) 2019 Christian Schiller
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

'use strict';

export class ZhongwenDictionary {

    constructor(wordDict, wordIndex, taiwan) {
        this.wordDict = wordDict;
        this.wordIndex = wordIndex;
        this.cache = {};

        // data/taiwan.tsv: TRAD<tab>pin1 yin1<tab>Taiwan pin1 yin1, readings of
        // 《國語辭典簡編本》 and CC-CEDICT's "Taiwan pr." that differ from the
        // dictionary's, for the option "Đọc kiểu Đài Loan"
        this.taiwan = new Map();
        for (let line of (taiwan || '').split('\n')) {
            let [word, pinyin, taiwanPinyin] = line.replace(/\r$/, '').split('\t');
            if (taiwanPinyin) {
                this.taiwan.set(word + '\t' + pinyin, taiwanPinyin);
            }
        }
    }

    // The Taiwan reading of each entry line that has one: {line: 'le4 se4'}.
    // The word's own reading (垃圾 lè sè), else that of each of its characters
    // (期 qí in 星期), keyed by the traditional form, so that simplified text
    // gets it too. Only shown: the line, its pinyin and its Hán-Việt stay as they are.
    taiwanReadings(lines) {
        let readings = {};
        for (let line of lines) {
            let m = line.match(/^(\S+) \S+ \[([^\]]*)\]/);
            if (!m) {
                continue;
            }
            let trad = m[1];
            let syllables = m[2].split(' ');
            let pinyin = m[2].toLowerCase();
            let taiwan = this.taiwan.get(trad + '\t' + pinyin);
            let chars = [...trad];
            if (taiwan) {
                taiwan = taiwan.split(' ');
            } else if (chars.length === syllables.length) {
                taiwan = syllables.map((s, i) => this.taiwan.get(chars[i] + '\t' + s.toLowerCase()) || s);
            } else {
                continue;
            }
            if (taiwan.length !== syllables.length) {
                continue;
            }
            // proper nouns keep their capital letter: 亞洲 Yà zhōu
            taiwan = taiwan.map((s, i) => syllables[i] !== syllables[i].toLowerCase() && s === s.toLowerCase()
                ? s.charAt(0).toUpperCase() + s.slice(1) : s);
            if (taiwan.join(' ') !== m[2]) {
                readings[line] = taiwan.join(' ');
            }
        }
        return readings;
    }

    static find(needle, haystack) {

        let beg = 0;
        let end = haystack.length - 1;

        while (beg < end) {
            let mi = Math.floor((beg + end) / 2);
            let i = haystack.lastIndexOf('\n', mi) + 1;

            let mis = haystack.substr(i, needle.length);
            if (needle < mis) {
                end = i - 1;
            } else if (needle > mis) {
                beg = haystack.indexOf('\n', mi + 1) + 1;
            } else {
                return haystack.substring(i, haystack.indexOf('\n', mi + 1));
            }
        }

        return null;
    }

    // Keep only the longest matching word (the Hán-Việt reading under each character
    // already explains the parts), and drop entries without a meaning of their own
    // (variants, "dùng trong ...", surnames) if a real one is left.
    static mainEntries(entry) {
        let longest = entry.data.filter(d => d[1].length === entry.matchLen);
        let main = longest.filter(d => !ZhongwenDictionary.isMinorEntry(d[0]));
        return main.length > 0 ? main : longest;
    }

    // Entries of each character of a word of several characters, shown after the
    // word's own: the meaning of the whole word does not always fit the context,
    // and the first character cannot be looked up on its own in the text.
    // The reading the word gives the character comes first.
    charEntries(entry) {
        let [line, word] = entry.data[0];
        let chars = [...word];
        if (chars.length < 2) {
            return [];
        }
        let m = line.match(/\[(.*?)\]/);
        let syllables = m ? m[1].toLowerCase().split(/\s+/) : [];
        let readingOf = l => (l.match(/\[(.*?)\]/) || ['', ''])[1].toLowerCase();

        // a character repeated in the word (飄飄) is shown once
        return [...new Set(chars)].map(char => {
            let found = this.wordSearch(char);
            if (!found) {
                return null;
            }
            let lines = ZhongwenDictionary.mainEntries(found).map(d => d[0]);
            let reading = syllables.length === chars.length ? syllables[chars.indexOf(char)] : '';
            lines.sort((a, b) => (readingOf(b) === reading) - (readingOf(a) === reading));
            return {char, lines};
        }).filter(c => c !== null);
    }

    static isMinorEntry(line) {
        let m = line.match(/\/(.*)\//);
        if (!m) {
            return false;
        }
        return m[1].split('/').every(def =>
            /^(họ(\s|$)|biến thể|dạng (cổ|cũ|khác)|dùng trong|xem |cũng viết|phồn thể của|giản thể của)/i.test(def.trim()));
    }

    wordSearch(word, max) {

        let entry = { data: [] };

        let dict = this.wordDict;
        let index = this.wordIndex;

        let maxTrim = max || 7;

        let count = 0;
        let maxLen = 0;

        WHILE:
            while (word.length > 0) {

                let ix = this.cache[word];
                if (!ix) {
                    ix = ZhongwenDictionary.find(word + ',', index);
                    if (!ix) {
                        this.cache[word] = [];
                        continue;
                    }
                    ix = ix.split(',');
                    this.cache[word] = ix;
                }

                for (let j = 1; j < ix.length; ++j) {
                    let offset = ix[j];

                    let dentry = dict.substring(offset, dict.indexOf('\n', offset));

                    if (count >= maxTrim) {
                        entry.more = 1;
                        break WHILE;
                    }

                    ++count;
                    if (maxLen === 0) {
                        maxLen = word.length;
                    }

                    entry.data.push([dentry, word]);
                }

                word = word.substr(0, word.length - 1);
            }

        if (entry.data.length === 0) {
            return null;
        }

        entry.matchLen = maxLen;
        return entry;
    }
}
