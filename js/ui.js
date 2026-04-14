class UIManager {
    constructor() {
        this.els = {
            loading: document.getElementById('loading'),
            loadingStatus: document.getElementById('loading-status'),
            progressBar: document.getElementById('progress-bar'),
            loadingTip: document.getElementById('loading-tip'),
            sidebar: document.getElementById('sidebar'),
            bookList: document.getElementById('book-list'),
            thumbnailList: document.getElementById('thumbnail-list'),
            tocView: document.getElementById('toc-view'),
            tocList: document.getElementById('toc-list'),
            tocSearch: document.getElementById('toc-search'),
            notesView: document.getElementById('notes-view'),
            viewer: document.getElementById('pdf-viewer-container'),
            pageInput: document.getElementById('page-input'),
            pageCount: document.getElementById('page-count'),
            zoomPercent: document.getElementById('zoom-percent'),
            cuteCard: document.querySelector('.cute-card'),
            fsIcon: document.getElementById('fs-icon'),
            currentTitle: document.getElementById('current-title'),
            scrubBarContainer: document.getElementById('scrub-bar-container'),
            scrubBarProgress: document.getElementById('scrub-bar-progress'),
            scrubPreview: document.getElementById('scrub-preview'),
            scrubPreviewCanvas: document.getElementById('scrub-preview-canvas'),
            scrubPreviewText: document.getElementById('scrub-preview-text'),
            settingsModal: document.getElementById('settings-modal'),
            noteTextarea: document.getElementById('note-textarea')
        };
        this.messageInterval = null;
        this.MESSAGES = [
            "司機正在將厚實的書本搬上車...",
            "準備出發！油箱已加滿胡蘿蔔汁... 🥕",
            "正在導航至心動小鎮書房...",
            "遇到紅燈了，請小車稍微等一下...",
            "小車正在爬坡，這本書真的很有份量！💪",
            "正在幫您的專屬書籍找個好位置...",
            "即將抵達目的地，正在停車中...",
            "正在展開所有書頁，請稍候..."
        ];

        this.initTabs();
        this.initSettings();
        this.initFullscreen();
        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('toggle-sidebar').onclick = () => {
            this.els.sidebar.classList.toggle('collapsed');
            setTimeout(() => document.getElementById('fit-page').click(), 400);
        };
        document.getElementById('settings-btn').onclick = () => {
             this.els.settingsModal.classList.remove('hidden');
        };
        document.getElementById('close-settings').onclick = () => {
             this.els.settingsModal.classList.add('hidden');
             location.reload(); // Reload to apply settings
        };

        // Notes saving
        this.els.noteTextarea.addEventListener('input', (e) => {
             if (window.App && window.App.currentFilename) {
                 Store.saveNote(window.App.currentFilename, e.target.value);
             }
        });
    }

    initTabs() {
        const tabs = ['books', 'thumbs', 'toc', 'notes'];
        tabs.forEach(tab => {
            const btn = document.getElementById(`tab-${tab}`);
            if (btn) {
                btn.onclick = () => this.switchTab(tab);
            }
        });
    }

    switchTab(activeTab) {
        // Reset buttons
        ['books', 'thumbs', 'toc', 'notes'].forEach(tab => {
            const btn = document.getElementById(`tab-${tab}`);
            btn.classList.remove('bg-white', 'text-[#8C6A5D]');
            btn.classList.add('text-[#DAC0A3]');
        });
        const activeBtn = document.getElementById(`tab-${activeTab}`);
        activeBtn.classList.remove('text-[#DAC0A3]');
        activeBtn.classList.add('bg-white', 'text-[#8C6A5D]');

        // Reset views
        this.els.bookList.classList.add('hidden');
        this.els.thumbnailList.classList.add('hidden');
        this.els.tocView.classList.add('hidden');
        this.els.tocView.classList.remove('flex');
        this.els.notesView.classList.add('hidden');

        // Show active
        if (activeTab === 'books') this.els.bookList.classList.remove('hidden');
        if (activeTab === 'thumbs') this.els.thumbnailList.classList.remove('hidden');
        if (activeTab === 'toc') {
            this.els.tocView.classList.remove('hidden');
            this.els.tocView.classList.add('flex');
        }
        if (activeTab === 'notes') {
            this.els.notesView.classList.remove('hidden');
            if (window.App && window.App.currentFilename) {
                this.els.noteTextarea.value = Store.getNote(window.App.currentFilename);
            }
        }
    }

    initSettings() {
        const checkPos = document.getElementById('setting-remember');
        const checkScrub = document.getElementById('setting-scrub');
        const checkLazy = document.getElementById('setting-lazy');

        checkPos.checked = Store.settings.rememberPosition;
        checkScrub.checked = Store.settings.showScrubBar;
        checkLazy.checked = Store.settings.lazyLoad;

        checkPos.onchange = (e) => { Store.settings.rememberPosition = e.target.checked; Store.saveSettings(); };
        checkScrub.onchange = (e) => { Store.settings.showScrubBar = e.target.checked; Store.saveSettings(); };
        checkLazy.onchange = (e) => { Store.settings.lazyLoad = e.target.checked; Store.saveSettings(); };
    }

    initFullscreen() {
        document.getElementById('toggle-fullscreen').onclick = () => {
            if (!document.fullscreenElement) {
                this.els.cuteCard.requestFullscreen().catch(err => console.log(err));
            } else {
                document.exitFullscreen();
            }
        };

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.els.cuteCard.classList.remove('max-w-6xl', 'h-[90vh]', 'md:h-[85vh]');
                this.els.cuteCard.classList.add('w-screen', 'h-screen');
                this.els.cuteCard.style.borderRadius = '0px';
                this.els.cuteCard.style.border = 'none';
                this.els.fsIcon.setAttribute('d', 'M6 18L18 6M6 6l12 12');
            } else {
                this.els.cuteCard.classList.add('max-w-6xl', 'h-[90vh]', 'md:h-[85vh]');
                this.els.cuteCard.classList.remove('w-screen', 'h-screen');
                this.els.cuteCard.style.borderRadius = '30px';
                this.els.cuteCard.style.border = '4px solid #DAC0A3';
                this.els.fsIcon.setAttribute('d', 'M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4');
            }
            setTimeout(() => document.getElementById('fit-page').click(), 300);
        });
    }

    showLoading(show) {
        if (show) {
            this.els.loading.style.display = 'flex';
            this.els.loading.style.opacity = '1';
            this.startMessageCycle();
        } else {
            this.els.loading.style.opacity = '0';
            setTimeout(() => {
                this.els.loading.style.display = 'none';
                this.stopMessageCycle();
            }, 500);
        }
    }

    updateLoadingProgress(percent, isCache) {
        this.els.progressBar.style.width = `${percent}%`;
        if (isCache) {
            this.els.loadingStatus.innerText = "🚀 從本地快取讀取中，光速載入！";
            if (percent < 100) this.els.progressBar.style.width = '40%';
        } else {
            this.els.loadingStatus.innerText = `初次下載中，自動存入快取：${percent}%`;
        }
    }

    setRenderingProgress(current, total) {
        this.els.progressBar.style.width = `${40 + (current / total) * 60}%`;
        this.els.loadingStatus.innerText = `正在為您精美印刷中 (${current} / ${total})...`;
    }

    startMessageCycle() {
        let i = 0;
        this.els.loadingTip.innerText = this.MESSAGES[0];
        this.messageInterval = setInterval(() => {
            i = (i + 1) % this.MESSAGES.length;
            this.els.loadingTip.classList.remove('fadeIn');
            void this.els.loadingTip.offsetWidth; 
            this.els.loadingTip.innerText = this.MESSAGES[i];
        }, 3000);
    }

    stopMessageCycle() {
        if (this.messageInterval) clearInterval(this.messageInterval);
    }
    
    renderTOC(outline, onNavigate) {
        this.els.tocList.innerHTML = '';
        if (!outline || outline.length === 0) {
            this.els.tocList.innerHTML = '<div class="text-sm text-center text-[#DAC0A3] mt-4">此文件不包含目錄</div>';
            return;
        }
        
        const renderLevel = (items, depth) => {
            const ul = document.createElement('div');
            ul.style.paddingLeft = depth * 15 + 'px';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'toc-item truncate';
                div.innerText = item.title;
                div.onclick = () => {
                    if (typeof item.dest === 'string') {
                        onNavigate(item.dest);
                    } else if (Array.isArray(item.dest)) {
                        onNavigate(item.dest);
                    }
                };
                ul.appendChild(div);
                if (item.items && item.items.length > 0) {
                    ul.appendChild(renderLevel(item.items, depth + 1));
                }
            });
            return ul;
        };

        this.els.tocList.appendChild(renderLevel(outline, 0));
    }

    // --- Snippet (Pin) Feature ---
    createFloatingSnippet(pageNum, sourceCanvas) {
        const id = `snippet-${Date.now()}`;
        const snippet = document.createElement('div');
        snippet.id = id;
        snippet.className = 'floating-snippet';
        snippet.innerHTML = `
            <div class="snippet-header">
                <span>頁面 ${pageNum}</span>
                <button onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
            <div class="snippet-body">
                <canvas id="canvas-${id}"></canvas>
            </div>
        `;
        document.body.appendChild(snippet);
        
        const targetCanvas = document.getElementById(`canvas-${id}`);
        const ctx = targetCanvas.getContext('2d');
        targetCanvas.width = sourceCanvas.width;
        targetCanvas.height = sourceCanvas.height;
        ctx.drawImage(sourceCanvas, 0, 0);

        this.makeDraggable(snippet);
    }

    makeDraggable(el) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        const header = el.querySelector('.snippet-header');
        
        // Mouse Events
        header.onmousedown = (e) => dragStart(e, e.clientX, e.clientY);
        // Touch Events
        header.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            dragStart(e, touch.clientX, touch.clientY);
        }, { passive: false });

        function dragStart(e, clientX, clientY) {
            e.preventDefault();
            pos3 = clientX;
            pos4 = clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = (ev) => elementDrag(ev, ev.clientX, ev.clientY);
            
            document.addEventListener('touchend', closeDragElement);
            document.addEventListener('touchmove', (ev) => {
                const touch = ev.touches[0];
                elementDrag(ev, touch.clientX, touch.clientY);
            }, { passive: false });
        }

        function elementDrag(e, clientX, clientY) {
            // No preventDefault here to allow some scroll if needed, but usually we want to block it for dragging
            pos1 = pos3 - clientX;
            pos2 = pos4 - clientY;
            pos3 = clientX;
            pos4 = clientY;
            el.style.top = (el.offsetTop - pos2) + "px";
            el.style.left = (el.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            document.onmouseup = null;
            document.onmousemove = null;
            document.removeEventListener('touchend', closeDragElement);
            // Non-trivial to remove anonymous touchmove, so we usually use named one, but this is a one-off
        }
    }
}

window.UI = new UIManager();
