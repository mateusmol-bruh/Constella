const { parentPort, workerData } = require('node:worker_threads');
const { createFile, Log } = require('mp4box');
Log.setLogLevel(Log.error);
try {
  const data = require('node:fs').readFileSync(workerData);
  // Reject truncated boxes before metadata parsing (including a truncated mdat).
  let offset = 0,
    hasMedia = false;
  while (offset < data.length) {
    if (offset + 8 > data.length) throw Error();
    let length = data.readUInt32BE(offset),
      head = 8;
    const kind = data.toString('ascii', offset + 4, offset + 8);
    if (length === 1) {
      if (offset + 16 > data.length) throw Error();
      length = Number(data.readBigUInt64BE(offset + 8));
      head = 16;
    }
    if (length === 0) length = data.length - offset;
    if (
      !Number.isSafeInteger(length) ||
      length < head ||
      offset + length > data.length
    )
      throw Error();
    if (kind === 'mdat' && length > head) hasMedia = true;
    offset += length;
  }
  if (data.length < 16 || data.toString('ascii', 4, 8) !== 'ftyp' || !hasMedia)
    throw Error();
  let result;
  const file = createFile(false);
  file.onError = () => {
    throw Error();
  };
  file.onReady = (info) => {
    const videos = info.videoTracks || [],
      audios = info.audioTracks || [];
    if (
      videos.length !== 1 ||
      !/^avc[13]\./.test(videos[0].codec) ||
      audios.some((t) => !/^mp4a\.40\.2$/.test(t.codec)) ||
      info.tracks.length !== videos.length + audios.length
    )
      throw Error();
    const track = videos[0],
      width = track.video.width,
      height = track.video.height,
      duration = track.duration / track.timescale;
    if (
      !width ||
      !height ||
      width > 3840 ||
      height > 3840 ||
      width * height > 8294400 ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      duration > 3600 ||
      !track.nb_samples
    )
      throw Error();
    if (
      file.moov?.traks?.some((t) =>
        t.mdia?.minf?.stbl?.stsd?.entries?.some((e) => e.sinf),
      )
    )
      throw Error();
    result = { width, height, duration };
  };
  const buffer = data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
  buffer.fileStart = 0;
  file.appendBuffer(buffer);
  file.flush();
  if (!result) throw Error();
  parentPort.postMessage(result);
} catch {
  parentPort.postMessage({ error: true });
}
