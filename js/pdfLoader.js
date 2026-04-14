const PDFLoader = {
    pdfDoc: null,
    total: 0,
    currentFilename: '',
    canvases: [],
    baseScale: 1.0,
    outline: null,

    async load(filename, progressCallback) {
        let loadingTask;
        let fromCache = false;

        if ('caches' in window) {
            try {
                const cache = await caches.open('heartopia-pdf-cache-v1');
                const cachedResponse = await cache.match(filename);
                if (cachedResponse) {
                    fromCache = true;
                    progressCallback(100, true);
                    const buffer = await cachedResponse.arrayBuffer();
                    loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
                }
            } catch (e) {
                console.warn("讀取快取失敗:", e);
            }
        }

        if (!fromCache) {
            loadingTask = pdfjsLib.getDocument(filename);
            loadingTask.onProgress = function (progress) {
                if (progress.total > 0) {
                    const percent = Math.round((progress.loaded / progress.total) * 100);
                    progressCallback(percent, false);
                }
            };
        }

        this.pdfDoc = await loadingTask.promise;
        this.currentFilename = filename;
        this.total = this.pdfDoc.numPages;

        if (!fromCache && 'caches' in window) {
            this.pdfDoc.getData().then(data => {
                caches.open('heartopia-pdf-cache-v1').then(cache => {
                    cache.put(filename, new Response(data, {
                        headers: { 'Content-Type': 'application/pdf' }
                    }));
                });
            }).catch(e => console.warn("儲存快取發生錯誤:", e));
        }

        // Fetch TOC
        try {
            this.outline = await this.pdfDoc.getOutline();
        } catch (e) {
            console.warn("解析目錄失敗或沒有目錄");
        }

        return { doc: this.pdfDoc, total: this.total, outline: this.outline };
    },

    async renderPageThumb(pageNum, rotation) {
        const page = await this.pdfDoc.getPage(pageNum);
        const thumbViewport = page.getViewport({ scale: 0.25, rotation });
        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbViewport.width;
        thumbCanvas.height = thumbViewport.height;
        await page.render({ canvasContext: thumbCanvas.getContext('2d'), viewport: thumbViewport }).promise;
        return thumbCanvas;
    },

    async renderPageMain(pageNum, baseScale, rotation) {
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: baseScale, rotation });
        const outputScale = window.devicePixelRatio || 1;
        
        const mainCanvas = document.createElement('canvas');
        mainCanvas.id = `page-${pageNum}`;
        mainCanvas.className = 'max-w-full shadow-xl rounded-lg bg-white shrink-0 transition-all duration-300';
        mainCanvas.width = Math.floor(viewport.width * outputScale);
        mainCanvas.height = Math.floor(viewport.height * outputScale);
        mainCanvas.style.width = Math.floor(viewport.width) + "px";
        mainCanvas.style.height = Math.floor(viewport.height) + "px";
        mainCanvas.setAttribute('data-base-width', viewport.width);
        mainCanvas.setAttribute('data-base-height', viewport.height);

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
        await page.render({ canvasContext: mainCanvas.getContext('2d'), viewport: viewport, transform: transform }).promise;
        
        return mainCanvas;
    }
};

window.PDFLoader = PDFLoader;
