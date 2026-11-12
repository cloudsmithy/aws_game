# 各模式玩法讲解的配音：用 CosyVoice 2（CosyVoice2-0.5B，代码和模型都是 Apache-2.0）逐句合成 wav，mexp_narrate.mjs 调用。
# CosyVoice 2 没有预置音色，要给一段参考声音：先用 CosyVoice-300M-SFT 官方预置的「中文女」合成一句话当参考，
# 再让 CosyVoice 2 照这个声音念（zero-shot）。不用任何真人录音，音色也和 300M-SFT 版的讲解一致。
# 合成过的句子按（模型、参考声音、文字）缓存在 tools/promo/mexp_out/tts_cache，改讲解词时只重新合成改过的那几句。
# 用法：~/miniconda3/envs/cosyvoice/bin/python tools/promo/mexp_tts.py 讲解词.json 输出目录（要在 ~/tts/CosyVoice 下运行）
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
MODEL = os.environ.get('MEXP_TTS_MODEL', 'CosyVoice2-0.5B')
SPEED = float(os.environ.get('MEXP_TTS_SPEED', '0.88'))   # 原速偏快，慢一点念
# PROMPT_TEXT 是参考音频 prompt_sft_zhongwennv.wav 念的原文，也是全部配音缓存文件名的一部分：游戏改名（大富翁 → 云上大亨）时特意没改它，
# 一改参考音频和文字就对不上，6 个模式讲解要整片重新合成、时间点全变。它不上屏，成片里也听不到。
PROMPT_TEXT = '欢迎来到亚马逊云科技 User Group 大富翁，下面给你讲讲这个模式怎么玩。'
os.makedirs(out, exist_ok=True)
cache = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mexp_out', 'tts_cache')
os.makedirs(cache, exist_ok=True)

# 参考声音：300M-SFT 的官方预置音色「中文女」念一句
prompt = os.path.join(cache, 'prompt_sft_zhongwennv.wav')
if not os.path.exists(prompt):
    sft = AutoModel(model_dir=os.path.join(REPO, 'pretrained_models', 'CosyVoice-300M-SFT'))
    wav = torch.cat([j['tts_speech'] for j in sft.inference_sft(PROMPT_TEXT, '中文女', stream=False)], dim=1)
    torchaudio.save(prompt, wav, sft.sample_rate)
    del sft

lines = [ln[0] for seg in json.load(open(script, encoding='utf-8'))['segs'] for ln in seg['lines']]
tts = None
for n, text in enumerate(lines):
    f = os.path.join(out, f'{n:03d}.wav')
    c = os.path.join(cache, hashlib.sha1(f'{MODEL}|{PROMPT_TEXT}|{SPEED}|{text}'.encode()).hexdigest() + '.wav')
    if not os.path.exists(c):
        if tts is None:
            tts = AutoModel(model_dir=os.path.join(REPO, 'pretrained_models', MODEL))
        wav = torch.cat([j['tts_speech'] for j in tts.inference_zero_shot(text, PROMPT_TEXT, prompt, stream=False, speed=SPEED)], dim=1)
        torchaudio.save(c, wav, tts.sample_rate)
    shutil.copy(c, f)
    print(f'{n + 1}/{len(lines)} {text}', flush=True)
