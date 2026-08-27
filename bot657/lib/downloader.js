const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");
const os = require("os");

// Marge de sécurité sous la limite d'envoi de WhatsApp (~64-100 Mo selon le client)
const MAX_SIZE_MB = 45;

async function searchVideo(query) {
  const result = await youtubedl(`ytsearch1:${query}`, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    preferFreeFormats: true,
    skipDownload: true,
  });
  const video = result.entries ? result.entries[0] : result;
  if (!video) return null;
  return { url: video.webpage_url || video.original_url || video.url, title: video.title };
}

async function downloadAudio(query) {
  const info = await searchVideo(query);
  if (!info) return null;

  const outputPath = path.join(os.tmpdir(), `657_audio_${Date.now()}.m4a`);

  await youtubedl(info.url, {
    output: outputPath,
    format: "bestaudio[ext=m4a]/bestaudio",
    noWarnings: true,
    noCheckCertificates: true,
  });

  if (!fs.existsSync(outputPath)) return null;
  const sizeMB = fs.statSync(outputPath).size / (1024 * 1024);
  return { path: outputPath, title: info.title, sizeMB };
}

async function downloadVideo(query) {
  const info = await searchVideo(query);
  if (!info) return null;

  const outputPath = path.join(os.tmpdir(), `657_video_${Date.now()}.mp4`);

  await youtubedl(info.url, {
    output: outputPath,
    format: "mp4[height<=480]/best[height<=480]",
    noWarnings: true,
    noCheckCertificates: true,
  });

  if (!fs.existsSync(outputPath)) return null;
  const sizeMB = fs.statSync(outputPath).size / (1024 * 1024);
  return { path: outputPath, title: info.title, sizeMB };
}

module.exports = { searchVideo, downloadAudio, downloadVideo, MAX_SIZE_MB };
