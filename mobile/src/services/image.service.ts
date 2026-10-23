import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

export interface SelectedImage { uri: string; base64: string; uploadedPath?: string }
export const maxImageBytes = 2 * 1024 * 1024;

export async function selectImage(aspect: [number, number], source: 'library' | 'camera' = 'library'): Promise<SelectedImage | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('CAMERA_SEM_PERMISSAO');
  }
  const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  let result: ImagePicker.ImagePickerResult;
  try {
    result = await launch({ mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.7, base64: true });
  } catch (cause) {
    if (source === 'camera') throw new Error('CAMERA_INDISPONIVEL');
    throw cause;
  }
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error('IMAGEM_INVALIDA');
  const bytes = asset.base64.length * 3 / 4 - (asset.base64.endsWith('==') ? 2 : asset.base64.endsWith('=') ? 1 : 0);
  if (bytes > maxImageBytes) throw new Error('IMAGEM_MUITO_GRANDE');
  return { uri: asset.uri, base64: asset.base64 };
}

export async function uploadImage(image: SelectedImage, privada = false, signal?: AbortSignal): Promise<string> {
  if (image.uploadedPath && image.uploadedPath.startsWith(privada ? "/api/anexos/" : "/uploads/")) return image.uploadedPath;
  const { data } = await api.post<{ caminho: string }>('/api/uploads/imagens', { imagem: image.base64, ...(privada ? { privada: true } : {}) }, { timeout: 30000, signal });
  if (!(privada ? /^\/api\/anexos\/[1-9]\d*-[a-f0-9-]+\.(jpg|png)$/ : /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/).test(data.caminho)) throw new Error('IMAGEM_RESPOSTA_INVALIDA');
  return data.caminho;
}

