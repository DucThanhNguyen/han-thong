/* global globalThis */

globalThis.defaultConfig = {
    // reading paper of the Hán Thông app: auto (light or dark, as the system),
    // light, sepia, blue, gray, dark
    background: 'auto',
    // Han character size in px; pinyin, zhuyin and Hán-Việt follow it
    fontSize: 32,
    hanziColor: 'ink',
    hanziFont: 'kai',
    maxSenses: 4,
    popupKey: 'none',
    saveToWordList: 'firstEntryOnly',
    showHanViet: true,
    showPinyin: true,
    simpTrad: 'auto',
    toneColors: true,
    zhuyin: true
};

// Han character sizes offered, as in the Hán Thông app
globalThis.fontSizes = {min: 20, max: 64, step: 2};

// Values stored by earlier versions, and what they are now
globalThis.legacyOptions = {
    background: {white: 'light', yellow: 'sepia', lightblue: 'blue', black: 'dark'},
    fontSize: {small: 32, medium: 44, large: 56}
};

// Class names of the popup for the background and Han character ink chosen
globalThis.popupClassName = function (config) {
    let theme = globalThis.legacyOptions.background[config.background] || config.background;
    if (!['light', 'sepia', 'blue', 'gray', 'dark'].includes(theme)) {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'ht-theme-' + theme + ' ht-ink-' + config.hanziColor;
};

// Han character size in px, also for a size stored by an earlier version
globalThis.hanziSize = function (config) {
    let size = globalThis.legacyOptions.fontSize[config.fontSize] || Number(config.fontSize);
    return size >= globalThis.fontSizes.min && size <= globalThis.fontSizes.max ? size : globalThis.defaultConfig.fontSize;
};
