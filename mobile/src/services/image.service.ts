import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { api } from './api';

export interface SelectedImage { uri: string; base64: string; width?: number; height?: number; uploadedPath?: string }
export const maxImageBytes = 2 * 1024 * 1024;
const byteLength = (base64: string) => base64.length * 3 / 4 - (base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0);

export async function selectImage(aspect?: [number, number], source: 'library' | 'camera' = 'library'): Promise<SelectedImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('CAMERA_SEM_PERMISSAO');
  }
  const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await launch({ mediaTypes: ['images'], allowsEditing: !!aspect, ...(aspect ? { aspect } : {}), quality: aspect ? 0.7 : 1, base64: !!aspect });
  } catch (cause) {
    if (source === 'camera') throw new Error('CAMERA_INDISPONIVEL');
    throw cause;
  }
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.uri) throw new Error('IMAGEM_INVALIDA');
  if (!aspect) {
    const context = ImageManipulator.manipulate(asset.uri, { maxWidth: 2048, maxHeight: 2048 });
    let rendered: Awaited<ReturnType<typeof context.renderAsync>> | undefined;
    try {
      // Uma só dimensão mantém a proporção; nenhuma operação de corte é aplicada.
      if (Math.max(asset.width, asset.height) > 2048) context.resize(asset.width >= asset.height ? { width: 2048 } : { height: 2048 });
      rendered = await context.renderAsync();
      let optimized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
      if (optimized.base64 && byteLength(optimized.base64) > maxImageBytes) optimized = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.55, base64: true });
      if (!optimized.base64) throw new Error('IMAGEM_INVALIDA');
      if (byteLength(optimized.base64) > maxImageBytes) throw new Error('IMAGEM_MUITO_GRANDE');
      return { uri: optimized.uri, base64: optimized.base64, width: optimized.width, height: optimized.height };
    } finally { rendered?.release(); context.release(); }
  }
  if (!asset?.base64) throw new Error('IMAGEM_INVALIDA');
  const bytes = byteLength(asset.base64);
  if (bytes > maxImageBytes) throw new Error('IMAGEM_MUITO_GRANDE');
  return { uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height };
}

export async function uploadImage(image: SelectedImage, privada = false, signal?: AbortSignal): Promise<string> {
  if (image.uploadedPath && image.uploadedPath.startsWith(privada ? "/api/anexos/" : "/uploads/")) return image.uploadedPath;
  const { data } = await api.post<{ caminho: string }>('/api/uploads/imagens', { imagem: image.base64, ...(privada ? { privada: true } : {}) }, { timeout: 60000, signal });
  if (!(privada ? /^\/api\/anexos\/[1-9]\d*-[a-f0-9-]+\.(jpg|png)$/ : /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/).test(data.caminho)) throw new Error('IMAGEM_RESPOSTA_INVALIDA');
  return data.caminho;
}

