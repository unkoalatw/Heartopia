const Store = {
    settings: {
        rememberPosition: true,
        showScrubBar: true,
        lazyLoad: false
    },
    
    // 初始化設定
    init() {
        const savedSettings = localStorage.getItem('heartopia_settings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
    },

    saveSettings() {
        localStorage.setItem('heartopia_settings', JSON.stringify(this.settings));
    },

    // 歷史紀錄
    saveHistory(filename, pageNum) {
        if (!this.settings.rememberPosition) return;
        const history = JSON.parse(localStorage.getItem('heartopia_history') || '{}');
        history[filename] = pageNum;
        localStorage.setItem('heartopia_history', JSON.stringify(history));
    },

    getHistory(filename) {
        if (!this.settings.rememberPosition) return 1;
        const history = JSON.parse(localStorage.getItem('heartopia_history') || '{}');
        return history[filename] || 1;
    },

    // 數位筆記
    saveNote(filename, noteContent) {
        const notes = JSON.parse(localStorage.getItem('heartopia_notes') || '{}');
        notes[filename] = noteContent;
        localStorage.setItem('heartopia_notes', JSON.stringify(notes));
    },

    getNote(filename) {
        const notes = JSON.parse(localStorage.getItem('heartopia_notes') || '{}');
        return notes[filename] || '';
    }
};

window.Store = Store;
