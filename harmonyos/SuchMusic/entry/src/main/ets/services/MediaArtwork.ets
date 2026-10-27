import { common } from '@kit.AbilityKit';
import { image } from '@kit.ImageKit';
import { http } from '@kit.NetworkKit';
import { fileIo as fs } from '@kit.CoreFileKit';
import { util } from '@kit.ArkTS';

const MAX_ARTWORK_BYTES: number = 8 * 1024 * 1024;

// Keep only the most recent encoded cover; each caller owns and releases its PixelMap.
export class MediaArtwork {
  private cachedUrl: string = '';
  private cachedBytes: ArrayBuffer | undefined = undefined;

  async placeholder(context: common.UIAbilityContext): Promise<image.PixelMap> {
    const bytes = await context.resourceManager.getMediaContent($r('app.media.app_icon').id);
    return this.decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }

  async load(url: string, context: common.UIAbilityContext): Promise<image.PixelMap> {
    if (url === this.cachedUrl && this.cachedBytes) return this.decode(this.cachedBytes);
    const bytes = await this.read(url, context);
    const bitmap = await this.decode(bytes);
    this.cachedUrl = url;
    this.cachedBytes = bytes;
    return bitmap;
  }

  private async decode(bytes: ArrayBuffer): Promise<image.PixelMap> {
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_ARTWORK_BYTES) throw new Error('封面文件大小超出限制');
    const source = image.createImageSource(bytes);
    try {
      const info = await source.getImageInfo();
      if (info.size.width <= 0 || info.size.height <= 0 || info.size.width * info.size.height > 64000000) throw new Error('封面尺寸无效');
      const ratio = Math.min(1, 512 / Math.max(info.size.width, info.size.height));
      return await source.createPixelMap({ desiredSize: { width: Math.max(1, Math.round(info.size.width * ratio)), height: Math.max(1, Math.round(info.size.height * ratio)) } });
    } finally { await source.release(); }
  }

  private async read(url: string, context: common.UIAbilityContext): Promise<ArrayBuffer> {
    if (url.startsWith('data:image/')) {
      const comma = url.indexOf(',');
      if (comma < 0 || !url.substring(0, comma).endsWith(';base64') || url.length > MAX_ARTWORK_BYTES * 1.4) throw new Error('封面编码无效');
      const bytes = new util.Base64Helper().decodeSync(url.substring(comma + 1));
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    if (url.startsWith('https://suchmusic.local/') || url.startsWith('/assets/') || url.startsWith('./assets/') || url.startsWith('assets/')) {
      const path = decodeURIComponent(url.replace('https://suchmusic.local/', '').replace(/^\.\//, '').replace(/^\//, '').split('?')[0].split('#')[0]);
      if (path.split('/').includes('..')) throw new Error('无效封面资源路径');
      const bytes = await context.resourceManager.getRawFileContent('web/' + path);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    if (/^https?:\/\//.test(url)) {
      const client = http.createHttp();
      try {
        const response = await client.request(url, { method: http.RequestMethod.GET, expectDataType: http.HttpDataType.ARRAY_BUFFER, connectTimeout: 5000, readTimeout: 8000, maxLimit: MAX_ARTWORK_BYTES });
        if (response.responseCode < 200 || response.responseCode >= 300 || !(response.result instanceof ArrayBuffer)) throw new Error('封面下载失败');
        return response.result;
      } finally { client.destroy(); }
    }
    const path = url.replace(/^file:\/\//, '');
    if (!path.startsWith(context.filesDir + '/') || path.split('/').includes('..')) throw new Error('不支持的封面地址');
    const file = fs.openSync(path, fs.OpenMode.READ_ONLY);
    try {
      const size = fs.statSync(file.fd).size;
      if (size > MAX_ARTWORK_BYTES) throw new Error('封面文件过大');
      const bytes = new ArrayBuffer(size);
      fs.readSync(file.fd, bytes);
      return bytes;
    } finally { fs.closeSync(file); }
  }
}
