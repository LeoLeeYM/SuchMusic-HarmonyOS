import { webview } from '@kit.ArkWeb';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { NativeBridge, Runtime } from '../services/NativeBridge';

@Entry
@Component
struct Index {
  private controller: webview.WebviewController = new webview.WebviewController();
  private bridge: NativeBridge = new NativeBridge();

  aboutToAppear(): void {
    this.bridge.attach(this.controller);
    webview.WebviewController.setWebDebuggingAccess(true);
  }

  aboutToDisappear(): void { this.bridge.detachWindow(); }

  onBackPress(): boolean {
    this.bridge.handleBack();
    return true;
  }

  build() {
    Column() {
      Web({ src: 'https://suchmusic.local/index.html', controller: this.controller })
        .onPageEnd(() => { this.bridge.syncSafeArea(); })
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .fileAccess(false)
        .onlineImageAccess(true)
        .mixedMode(MixedMode.All)
        .mediaPlayGestureAccess(false)
        .javaScriptProxy({ object: this.bridge, name: 'SuchHarmony', methodList: ['postMessage'], controller: this.controller })
        .onConsole((event) => {
          hilog.info(0x1234, 'SuchMusicWeb', '%{public}s', event.message.getMessage());
          return true;
        })
        .onInterceptRequest((event) => {
          const url = event.request.getRequestUrl();
          if (!url.startsWith('https://suchmusic.local/')) return null;
          const response = new WebResourceResponse();
          try {
            const path = decodeURIComponent(url.substring('https://suchmusic.local/'.length).split('?')[0].split('#')[0]);
            if (path.split('/').includes('..')) throw new Error('Invalid resource path');
            const data = Runtime.context?.resourceManager.getRawFileContentSync('web/' + (path || 'index.html'));
            if (!data) throw new Error('Resource unavailable');
            let mime = 'application/octet-stream';
            if (path.endsWith('.html')) mime = 'text/html';
            else if (path.endsWith('.js')) mime = 'text/javascript';
            else if (path.endsWith('.css')) mime = 'text/css';
            else if (path.endsWith('.json')) mime = 'application/json';
            else if (path.endsWith('.wasm')) mime = 'application/wasm';
            else if (path.endsWith('.svg')) mime = 'image/svg+xml';
            else if (path.endsWith('.png')) mime = 'image/png';
            else if (path.endsWith('.woff')) mime = 'font/woff';
            else if (path.endsWith('.ttf')) mime = 'font/ttf';
            else if (path.endsWith('.otf')) mime = 'font/otf';
            response.setResponseData(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
            response.setResponseMimeType(mime);
            response.setResponseHeader([{ headerKey: 'Content-Type', headerValue: mime }, { headerKey: 'Cache-Control', headerValue: 'no-store' }]);
            if (mime.startsWith('text/') || mime === 'application/json') response.setResponseEncoding('utf-8');
            response.setResponseCode(200);
            response.setReasonMessage('OK');
          } catch (_) {
            response.setResponseCode(404); response.setReasonMessage('Not Found'); response.setResponseData('Not Found');
          }
          return response;
        })
        .onOverrideUrlLoading((request) => {
          const url = request.getRequestUrl();
          return !url.startsWith('https://suchmusic.local/');
        })
        .width('100%')
        .height('100%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f5f5f7')
    .expandSafeArea([SafeAreaType.SYSTEM, SafeAreaType.CUTOUT], [SafeAreaEdge.TOP, SafeAreaEdge.BOTTOM, SafeAreaEdge.START, SafeAreaEdge.END])
  }
}
