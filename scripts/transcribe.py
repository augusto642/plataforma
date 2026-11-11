#!/usr/bin/env python3
"""Transcrição via faster-whisper (adaptador ASR do knowledge-extract).

Uso: python transcribe.py --video <caminho.mp4> --model <tiny|base|small|...> [--language pt]
Saída: UMA linha JSON em stdout: {"text": "...", "durationSeconds": N}.
Nada da transcrição vai para arquivo: o extrator a mantém só em memória e
a descarta após o resumo (a transcrição nunca é commitada nem importada).

Decodificação: o áudio é decodificado pelo ffmpeg DO SISTEMA (16 kHz, mono)
e entregue ao modelo como array numpy — NÃO passa pelo `av` do faster-whisper.
Motivo (Q4, medido em 25/10): faster-whisper 1.2.1 chama
`av.open(..., metadata_errors="ignore")`, mas o `av` resolvido pelo pip
nesta VM (19.0.2) não aceita esse argumento, e as versões antigas do `av`
não têm wheel para este Python/plataforma (o build falha por falta das
libs libav* de desenvolvimento). Decodificar via ffmpeg evita o `av`
por completo e usa uma ferramenta já presente e conhecida.

O modelo roda em CPU com compute_type int8 (padrão do faster-whisper para
CPU). O idioma padrão é pt (as aulas do checkpoint são em português
brasileiro); sem --language, o faster-whisper detecta sozinho.
"""
import argparse
import json
import subprocess
import sys
import wave

import numpy as np
from faster_whisper import WhisperModel


def decode_to_pcm16(video_path: str) -> tuple[np.ndarray, int]:
    """Decodifica o áudio com o ffmpeg do sistema para PCM 16 kHz mono."""
    proc = subprocess.run(
        [
            "ffmpeg", "-v", "error",
            "-i", video_path,
            "-ar", "16000", "-ac", "1",
            "-f", "wav", "-",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(
            "ffmpeg falhou ao decodificar: "
            + proc.stderr.decode("utf-8", "replace")[:300]
        )
    import io

    with wave.open(io.BytesIO(proc.stdout), "rb") as wav:
        frames = wav.readframes(wav.getnframes())
        rate = wav.getframerate()
    pcm = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
    return pcm, rate


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", required=True)
    parser.add_argument("--model", default="small")
    parser.add_argument("--language", default="pt")
    args = parser.parse_args()

    audio, rate = decode_to_pcm16(args.video)
    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        audio, language=args.language, beam_size=5
    )
    text = "".join(seg.text for seg in segments).strip()
    duration = len(audio) / rate
    sys.stdout.write(
        json.dumps({"text": text, "durationSeconds": duration}) + "\n"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
