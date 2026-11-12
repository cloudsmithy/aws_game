# 用 CosyVoice 把讲解词逐句合成 wav（narrate.mjs --tts cosyvoice 时调用）。
# 需要单独的 conda 环境和模型：仓库在 ~/tts/CosyVoice，模型在它的 pretrained_models/ 下。
# 用法：conda run -n cosyvoice python tools/promo/tts_cosyvoice.py 讲解词.json 输出目录 [模型名] [音色]
# 默认用 CosyVoice-300M-SFT 自带的「中文女」音色：官方预置音色，不是克隆别人的声音。
import hashlib
import json
import os
import shutil
import sys

REPO = os.path.expanduser('~/tts/CosyVoice')
sys.path[:0] = [REPO, os.path.join(REPO, 'third_party', 'Matcha-TTS')]
from cosyvoice.cli.cosyvoice import AutoModel  # noqa: E402
import torch  # noqa: E402
import torchaudio  # noqa: E402

script, out = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else 'CosyVoice-300M-SFT'
spk = sys.argv[4] if len(sys.argv) > 4 else '中文女'
os.makedirs(out, exist_ok=True)
tts = AutoModel(model_dir=os.path.join(REPO, 'pretrained_models', model))
lines = [ln[0] for seg in json.load(open(script, encoding='utf-8'))['segs'] for ln in seg['lines']]
# 合成过的句子按（模型、音色、文字）缓存，改讲解词时只重新合成改过的那几句
cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'tts_cache')
os.makedirs(cache, exist_ok=True)
for n, text in enumerate(lines):
    f = os.path.join(out, f'{n:03d}.wav')
    c = os.path.join(cache, hashlib.sha1(f'{model}|{spk}|{text}'.encode()).hexdigest() + '.wav')
    if not os.path.exists(c):
        wav = torch.cat([j['tts_speech'] for j in tts.inference_sft(text, spk, stream=False)], dim=1)
        torchaudio.save(c, wav, tts.sample_rate)
    shutil.copy(c, f)
    print(f'{n + 1}/{len(lines)} {text}', flush=True)
