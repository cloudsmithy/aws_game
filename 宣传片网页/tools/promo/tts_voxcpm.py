# 用 VoxCPM2（面壁智能开源的 TTS，装在本机 ~/voxcpm-src）逐句合成旁白，full_vo.mjs 调用它。
# 用法：~/voxcpm-src/VoxCPM/.venv/bin/python tools/promo/tts_voxcpm.py 任务.json
#   任务.json = [{"text": 念的文字, "voice": 音色描述, "seed": 42, "ref": 定音句.wav（可省）, "out": 输出.wav}, …]
# 「声音设计」：音色描述用括号写在文字最前面，模型照着描述造一个新的声音（括号里的不会念出来），不克隆任何真人的声音。
# 只靠描述的话，同一段描述 + 同一个 seed 换一句话就像换了个人（声纹相似度只有 0.2–0.6），
# 所以先用声音设计合成一句「定音句」，其余每句再把这句合成出来的声音当 ref（VoxCPM2 的 reference_wav_path）+ 同一段描述，
# 保证从头到尾是同一个（合成出来的）人。ref 只能是本脚本合成出来的定音句，不要放真人录音。
# 缓存：tools/promo/out/tts_voxcpm/<sha1(模型|cfg|步数|音色|seed|ref 内容|文字)>.wav，同样的组合不重复合成；
# 全部命中缓存时连模型都不加载（模型 9GB，机器忙的时候光加载就要一两分钟）。
import hashlib
import json
import os
import shutil
import sys
import time

MODEL = os.environ.get('VOXCPM_MODEL', os.path.expanduser('~/voxcpm-src/models/VoxCPM2'))
CFG, STEPS = 2.0, 10
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'tts_voxcpm')

jobs = json.load(open(sys.argv[1], encoding='utf-8'))
os.makedirs(CACHE, exist_ok=True)
refsum = lambda j: hashlib.sha1(open(j['ref'], 'rb').read()).hexdigest() if j.get('ref') else ''
key = lambda j: hashlib.sha1(f"VoxCPM2|{CFG}|{STEPS}|{j['voice']}|{j['seed']}|{refsum(j)}|{j['text']}".encode()).hexdigest()
model = None
for n, j in enumerate(jobs):
    c = os.path.join(CACHE, key(j) + '.wav')
    if not os.path.exists(c):
        if model is None:
            import soundfile as sf
            from voxcpm import VoxCPM
            t = time.time()
            model = VoxCPM.from_pretrained(MODEL, load_denoiser=False, optimize=False, device='mps')
            print(f'模型加载 {time.time() - t:.0f} 秒', flush=True)
        t = time.time()
        wav = model.generate(text=f"({j['voice']}){j['text']}", reference_wav_path=j.get('ref') or None, cfg_value=CFG, inference_timesteps=STEPS, seed=j['seed'])
        sf.write(c + '.part.wav', wav, model.tts_model.sample_rate, subtype='FLOAT')   # 存浮点，模型偶尔输出到满幅附近，存 16 位会削波
        os.replace(c + '.part.wav', c)
        print(f"{n + 1}/{len(jobs)} 合成 {time.time() - t:.0f} 秒  {j['text']}", flush=True)
    else:
        print(f"{n + 1}/{len(jobs)} 缓存  {j['text']}", flush=True)
    if j.get('out'):
        os.makedirs(os.path.dirname(os.path.abspath(j['out'])), exist_ok=True)
        shutil.copy(c, j['out'])
