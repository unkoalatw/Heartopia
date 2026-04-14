window.App = {
    pdfFiles: [
        { id: 1, title: '🏠 心動小鎮 (Heartopia)', filename: 'Heartopia.pdf' }
    ],
    pageNum: 1,
    rotation: 0,
    currentScaleMultiplier: 1.0,
    baseScale: 1.0,
    currentFilename: '',
    
    init() {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        this.setupAntiTheft(); // 啟動防竊機制
        
        this.renderBookList();
        this.bindToolbar();
        this.bindTouchGestures(); // 啟用手機手勢
        
        // Scrub bar setup
        if (Store.settings.showScrubBar) {
            UI.els.scrubBarContainer.classList.remove('hidden');
            this.bindScrubBar();
        }

        const defaultBook = this.pdfFiles[0];
        UI.els.currentTitle.innerText = defaultBook.title;
        this.loadBook(defaultBook.filename);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW setup failed:', err));
        }
    },

    setupAntiTheft() {
        // 禁用右鍵選單
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // 禁用常用開發者工具快捷鍵 (F12, Ctrl+U, Ctrl+Shift+I 等)
        document.addEventListener('keydown', e => {
            if (e.key === 'F12' || e.code === 'F12') e.preventDefault();
            if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) e.preventDefault();
            if (e.ctrlKey && ['U', 'u', 'S', 's'].includes(e.key)) e.preventDefault();
        });

        // 簡單的反調試 (如果有人打開 Console 會稍微停頓)
        setInterval(() => {
            const before = new Date().getTime();
            debugger;
            const after = new Date().getTime();
            if (after - before > 100) {
                // Detected debugger
            }
        }, 1000);
    },

    renderBookList() {
        UI.els.bookList.innerHTML = '';
        this.pdfFiles.forEach(file => {
            const btn = document.createElement('div');
            btn.className = 'book-item p-4 text-[#8C6A5D] font-bold text-lg';
            btn.innerHTML = `<div class="flex items-center gap-2"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> ${file.title}</div>`;
            btn.onclick = () => {
                document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
                btn.classList.add('active');
                UI.els.currentTitle.innerText = file.title;
                this.loadBook(file.filename);
            };
            UI.els.bookList.appendChild(btn);
        });
        setTimeout(() => {
            const first = document.querySelector('.book-item');
            if (first) first.classList.add('active');
        }, 100);
    },

    async loadBook(filename) {
        this.currentFilename = filename;
        UI.showLoading(true);

        try {
            const result = await PDFLoader.load(filename, (percent, isCache) => {
                UI.updateLoadingProgress(percent, isCache);
            });
            
            const total = result.total;
            UI.els.pageCount.textContent = total;
            UI.els.pageInput.max = total;
            
            UI.els.viewer.innerHTML = '';
            UI.els.thumbnailList.innerHTML = '';
            PDFLoader.canvases = [];
            this.currentScaleMultiplier = 1.0;

            const samplePage = await result.doc.getPage(1);
            const containerWidth = UI.els.viewer.clientWidth - 40;
            this.baseScale = containerWidth / samplePage.getViewport({ scale: 1.0, rotation: this.rotation }).width;
            if(this.baseScale < 1.0) this.baseScale = 1.0;
            if(this.baseScale > 2.5) this.baseScale = 2.5;

            // Optional Lazy Load implementation
            const numToRender = Store.settings.lazyLoad ? Math.min(3, total) : total;

            for (let i = 1; i <= total; i++) {
                if (i <= numToRender) {
                    UI.setRenderingProgress(i, numToRender);
                }

                // Render Thumbnail
                const thumbCanvas = await PDFLoader.renderPageThumb(i, this.rotation);
                thumbCanvas.className = 'thumb-canvas';
                const thumbItem = document.createElement('div');
                thumbItem.className = 'thumb-item';
                thumbItem.setAttribute('data-page', i);
                thumbItem.innerHTML = `<div class="text-[10px] font-black text-[#8C6A5D] mt-1.5 px-1">${i}</div>`;
                thumbItem.insertBefore(thumbCanvas, thumbItem.firstChild);
                thumbItem.onclick = () => this.scrollToPage(i);
                UI.els.thumbnailList.appendChild(thumbItem);

                // Setup Main Page
                const viewport = (await result.doc.getPage(i)).getViewport({scale: this.baseScale, rotation: this.rotation});
                const mainCanvasWrapper = document.createElement('div');
                mainCanvasWrapper.className = 'relative group';
                
                const mainCanvas = document.createElement('canvas'); // Placeholder
                mainCanvas.id = `page-${i}`;
                mainCanvas.className = 'max-w-full shadow-xl rounded-lg bg-white shrink-0 transition-none duration-0';
                mainCanvas.style.width = Math.floor(viewport.width) + "px";
                mainCanvas.style.height = Math.floor(viewport.height) + "px";
                mainCanvas.setAttribute('data-base-width', viewport.width);
                mainCanvas.setAttribute('data-base-height', viewport.height);
                
                // Add Pin Button for Game Guide convenience
                const pinBtn = document.createElement('button');
                pinBtn.className = 'absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-[#8C6A5D] text-white p-2 rounded-full shadow-lg hover:scale-110 active:scale-95';
                pinBtn.innerHTML = '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"></path></svg>';
                pinBtn.title = "釘選此頁在地圖小視窗";
                pinBtn.onclick = () => UI.createFloatingSnippet(i, mainCanvas);

                mainCanvasWrapper.appendChild(mainCanvas);
                mainCanvasWrapper.appendChild(pinBtn);
                UI.els.viewer.appendChild(mainCanvasWrapper);
                PDFLoader.canvases.push(mainCanvas);
                
                // If not lazy loading, immediately render content
                if (!Store.settings.lazyLoad || i <= 3) {
                    this.renderPageRealContent(i);
                }
            }

            // Implement lazy observer if enabled
            if (Store.settings.lazyLoad) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const id = entry.target.id;
                            const pageNumber = parseInt(id.replace('page-', ''));
                            if (!entry.target.hasAttribute('data-rendered')) {
                                this.renderPageRealContent(pageNumber);
                            }
                        }
                    });
                }, { root: UI.els.viewer, rootMargin: '500px' });
                PDFLoader.canvases.forEach(c => observer.observe(c));
            }

            // Outline
            UI.renderTOC(result.outline, async (dest) => {
                let pageNumber = 1;
                if (typeof dest === 'string') {
                    const destArr = await result.doc.getDestination(dest);
                    const pageRef = destArr[0];
                    pageNumber = (await result.doc.getPageIndex(pageRef)) + 1;
                } else if (Array.isArray(dest)) {
                    const pageRef = dest[0];
                    pageNumber = (await result.doc.getPageIndex(pageRef)) + 1;
                }
                this.scrollToPage(pageNumber);
            });

            UI.showLoading(false);
            
            // Go to history pos
            const lastPage = Store.getHistory(filename);
            this.pageNum = lastPage;
            setTimeout(() => {
                document.getElementById('fit-page').click();
                if (lastPage > 1) {
                    this.scrollToPage(lastPage);
                }
            }, 300);

            UI.switchTab('thumbs');
        } catch (e) {
            console.error(e);
            UI.showLoading(false);
        }
    },

    async renderPageRealContent(pageNum) {
        const canvas = document.getElementById(`page-${pageNum}`);
        if (!canvas || canvas.hasAttribute('data-rendered')) return;
        
        const page = await PDFLoader.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.baseScale, rotation: this.rotation });
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport, transform: transform }).promise;
        canvas.setAttribute('data-rendered', 'true');
    },

    scrollToPage(num) {
        const canvas = document.getElementById(`page-${num}`);
        if (canvas) {
            UI.els.viewer.scrollTo({
                top: canvas.offsetTop - UI.els.viewer.offsetTop,
                behavior: 'smooth'
            });
            this.pageNum = num;
            Store.saveHistory(this.currentFilename, num);
            this.updateScrubUI();
        }
    },

    bindToolbar() {
        UI.els.viewer.addEventListener('scroll', () => {
             if (!PDFLoader.canvases.length) return;
             let current = 1;
             let minDiff = Infinity;
             const containerCenter = UI.els.viewer.scrollTop + (UI.els.viewer.clientHeight / 2);
             PDFLoader.canvases.forEach((canvas, index) => {
                 const canvasCenter = (canvas.offsetTop - UI.els.viewer.offsetTop) + (canvas.offsetHeight / 2);
                 const diff = Math.abs(canvasCenter - containerCenter);
                 if (diff < minDiff) {
                     minDiff = diff;
                     current = index + 1;
                 }
             });

             if (this.pageNum !== current) {
                 this.pageNum = current;
                 UI.els.pageInput.value = this.pageNum;
                 document.querySelectorAll('.thumb-item').forEach(el => el.classList.remove('active'));
                 const activeThumb = document.querySelector(`.thumb-item[data-page="${this.pageNum}"]`);
                 if (activeThumb) {
                     activeThumb.classList.add('active');
                     activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                 }
                 Store.saveHistory(this.currentFilename, this.pageNum);
                 this.updateScrubUI();
             }
        });

        document.getElementById('zoom-in').onclick = () => { this.currentScaleMultiplier += 0.25; this.applyCSSZoom(); };
        document.getElementById('zoom-out').onclick = () => { if (this.currentScaleMultiplier <= 0.25) return; this.currentScaleMultiplier -= 0.25; this.applyCSSZoom(); };
        document.getElementById('fit-page').onclick = () => {
             if(!PDFLoader.canvases.length) return;
             const containerWidth = UI.els.viewer.clientWidth - 40;
             const containerHeight = UI.els.viewer.clientHeight - 40;
             const baseWidth = parseFloat(PDFLoader.canvases[0].getAttribute('data-base-width'));
             const baseHeight = parseFloat(PDFLoader.canvases[0].getAttribute('data-base-height'));
             this.currentScaleMultiplier = Math.max(0.2, Math.min(containerWidth / baseWidth, containerHeight / baseHeight));
             this.applyCSSZoom();
        };

        UI.els.pageInput.onchange = (e) => {
             const v = parseInt(e.target.value);
             if (v >= 1 && v <= PDFLoader.total) this.scrollToPage(v);
             else e.target.value = this.pageNum;
        };

        document.getElementById('prev-page').onclick = () => { if(this.pageNum > 1) this.scrollToPage(this.pageNum - 1); };
        document.getElementById('next-page').onclick = () => { if(this.pageNum < PDFLoader.total) this.scrollToPage(this.pageNum + 1); };

        document.getElementById('download-pdf').onclick = () => {
            const link = document.createElement('a');
            link.href = this.currentFilename; link.download = this.currentFilename; link.click();
        };
        document.getElementById('print-pdf').onclick = () => window.open(this.currentFilename, '_blank')?.print();

        document.getElementById('rotate-pdf').onclick = () => {
             this.rotation = (this.rotation + 90) % 360;
             this.loadBook(this.currentFilename);
        };
    },

    bindScrubBar() {
        const container = UI.els.scrubBarContainer;
        const progress = UI.els.scrubBarProgress;
        const preview = UI.els.scrubPreview;
        const ctx = UI.els.scrubPreviewCanvas.getContext('2d');

        const updatePreview = async (e) => {
            if (!PDFLoader.pdfDoc) return;
            const rect = container.getBoundingClientRect();
            const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
            const percent = x / rect.width;
            const targetPage = Math.max(1, Math.ceil(percent * PDFLoader.total));
            
            preview.style.left = `${x}px`;
            UI.els.scrubPreviewText.innerText = `第 ${targetPage} 頁`;

            // Draw miniature thumb quickly if we have it in sidebar
            const thumbItem = document.querySelector(`.thumb-item[data-page="${targetPage}"] canvas`);
            if (thumbItem) {
                ctx.clearRect(0,0,100,140);
                // Approximate scaling
                const scale = Math.min(100/thumbItem.width, 140/thumbItem.height);
                ctx.drawImage(thumbItem, 0, 0, thumbItem.width * scale, thumbItem.height * scale);
            }
        };

        container.addEventListener('mousemove', (e) => {
            preview.classList.remove('hidden');
            container.classList.add('scrub-active');
            updatePreview(e);
        });
        container.addEventListener('mouseleave', () => {
            preview.classList.add('hidden');
            container.classList.remove('scrub-active');
        });
        container.addEventListener('click', (e) => {
            const rect = container.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const targetPage = Math.max(1, Math.ceil(percent * PDFLoader.total));
            this.scrollToPage(targetPage);
        });
    },

    updateScrubUI() {
        if (!Store.settings.showScrubBar || !PDFLoader.total) return;
        const percent = (this.pageNum / PDFLoader.total) * 100;
        UI.els.scrubBarProgress.style.width = `${percent}%`;
    },

    applyCSSZoom() {
        UI.els.zoomPercent.innerText = Math.round(this.currentScaleMultiplier * 100) + '%';
        PDFLoader.canvases.forEach(canvas => {
            const originalW = parseFloat(canvas.getAttribute('data-base-width'));
            const originalH = parseFloat(canvas.getAttribute('data-base-height'));
            canvas.style.width = Math.floor(originalW * this.currentScaleMultiplier) + "px";
            canvas.style.height = Math.floor(originalH * this.currentScaleMultiplier) + "px";
        });
        setTimeout(() => this.scrollToPage(this.pageNum), 10);
    }
};

window.addEventListener('DOMContentLoaded', () => window.App.init());
