"""
PhotoStudio AI - Studio Pen-Cut Edition Desktop Server
Fast, reliable desktop server with automatic browser launch, dynamic port binding,
and background AI model pre-warming.
"""

import os
import sys
import io
import time
import socket
import threading
import webbrowser

class SafeStream:
    def __init__(self, stream):
        self._stream = stream
    def write(self, data):
        try:
            if self._stream is not None:
                self._stream.write(data)
        except Exception:
            pass
    def flush(self):
        try:
            if self._stream is not None:
                self._stream.flush()
        except Exception:
            pass
    def isatty(self):
        try:
            return self._stream.isatty() if self._stream else False
        except Exception:
            return False

try:
    if sys.stdout is not None:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    pass
sys.stdout = SafeStream(sys.stdout)

try:
    if sys.stderr is not None:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace', line_buffering=True)
except Exception:
    pass
sys.stderr = SafeStream(sys.stderr)

# Determine base directory (PyInstaller frozen bundle or normal script)
if getattr(sys, 'frozen', False):
    BASE_DIR = sys._MEIPASS
else:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Point U2NET_HOME to bundled offline model if available
local_models = os.path.join(BASE_DIR, 'models')
if os.path.exists(local_models):
    os.environ['U2NET_HOME'] = local_models

from flask import Flask, request, send_from_directory, jsonify, send_file
from flask_cors import CORS
from PIL import Image

# Dummy import for PyInstaller static scanner (not run at module level)
if False:
    import rembg

# rembg session state (lazy / background loading so app starts in 0.1s)
HAS_REMBG = None
REMBG_SESSION = None
SESSION_LOCK = threading.Lock()

def get_rembg_session():
    """Lazy-load the u2net session on demand or in background thread"""
    global HAS_REMBG, REMBG_SESSION
    with SESSION_LOCK:
        if HAS_REMBG is None:
            try:
                import rembg
                HAS_REMBG = True
            except Exception as e:
                print(f"[!] Warning importing rembg: {e}", flush=True)
                HAS_REMBG = False

        if HAS_REMBG and REMBG_SESSION is None:
            print("[*] [AI Engine] Loading u2net deep learning model in background...", flush=True)
            try:
                import rembg
                REMBG_SESSION = rembg.new_session('u2net')
                print("[OK] [AI Engine] u2net Model Ready for 100% automatic cutouts!", flush=True)
            except Exception as e:
                print(f"[!] [AI Engine] Warning initializing model: {e}", flush=True)
                REMBG_SESSION = None

    return REMBG_SESSION

def preload_model_in_background():
    """Warm up the model in a background thread so startup is instant"""
    t = threading.Thread(target=get_rembg_session, daemon=True)
    t.start()

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(BASE_DIR, path)

@app.route('/api/status', methods=['GET'])
def api_status():
    global HAS_REMBG, REMBG_SESSION
    return jsonify({
        'status': 'online',
        'engine': 'rembg_u2net' if HAS_REMBG else 'loading_or_fallback',
        'has_rembg': HAS_REMBG is not False,
        'model_loaded': REMBG_SESSION is not None
    })

def get_local_version_info():
    version_file = os.path.join(BASE_DIR, 'version.json')
    if os.path.exists(version_file):
        try:
            with open(version_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {
        'version': '1.2.0',
        'name': 'PhotoStudio AI',
        'update_url': 'https://raw.githubusercontent.com/telemy464-arch/PhotoStudioAI/main/version.json',
        'repo_url': 'https://github.com/telemy464-arch/PhotoStudioAI'
    }

def sync_dist_internal():
    dist_dir = os.path.join(BASE_DIR, 'dist', 'PhotoStudioAI', '_internal')
    if os.path.exists(dist_dir):
        try:
            import shutil
            for name in ['index.html', 'version.json']:
                src = os.path.join(BASE_DIR, name)
                if os.path.exists(src):
                    shutil.copy2(src, os.path.join(dist_dir, name))
            for folder in ['js', 'css']:
                src_f = os.path.join(BASE_DIR, folder)
                dst_f = os.path.join(dist_dir, folder)
                if os.path.exists(src_f):
                    shutil.copytree(src_f, dst_f, dirs_exist_ok=True)
        except Exception as e:
            print(f"[!] Warning syncing dist: {e}", flush=True)

@app.route('/api/version', methods=['GET'])
def api_version():
    return jsonify(get_local_version_info())

@app.route('/api/check-update', methods=['GET'])
def api_check_update():
    local_info = get_local_version_info()
    update_url = local_info.get('update_url', 'https://raw.githubusercontent.com/telemy464-arch/PhotoStudioAI/main/version.json')
    
    try:
        import urllib.request
        import json
        req = urllib.request.Request(update_url, headers={'User-Agent': 'PhotoStudioAI-Updater'})
        with urllib.request.urlopen(req, timeout=6) as res:
            remote_info = json.loads(res.read().decode('utf-8'))
            
        local_ver = local_info.get('version', '1.0.0')
        remote_ver = remote_info.get('version', '1.0.0')
        
        has_update = remote_ver != local_ver
        return jsonify({
            'has_update': has_update,
            'local_version': local_ver,
            'remote_version': remote_ver,
            'release_date': remote_info.get('release_date', ''),
            'changelog': remote_info.get('changelog', ''),
            'repo_url': remote_info.get('repo_url', local_info.get('repo_url', ''))
        })
    except Exception as e:
        return jsonify({
            'has_update': False,
            'local_version': local_info.get('version', '1.2.0'),
            'error': f'আপডেট চেক করতে পারেনি (ইন্টারনেট বা রিপোজিটরি চেক করুন): {str(e)}'
        })

@app.route('/api/apply-update', methods=['POST'])
def api_apply_update():
    git_dir = os.path.join(BASE_DIR, '.git')
    local_info = get_local_version_info()
    raw_base = 'https://raw.githubusercontent.com/telemy464-arch/PhotoStudioAI/main'
    
    # 1. Try Git pull first if .git exists
    if os.path.exists(git_dir):
        try:
            import subprocess
            res = subprocess.run(['git', 'pull', 'origin', 'main'], cwd=BASE_DIR, capture_output=True, text=True, timeout=30)
            if res.returncode == 0:
                sync_dist_internal()
                return jsonify({
                    'success': True,
                    'message': 'Git Pull সফল হয়েছে! সর্বশেষ আপডেট প্রয়োগ করা হয়েছে। পেজ রিলোড করুন।',
                    'details': res.stdout
                })
        except Exception as e:
            print(f"[!] Git pull failed: {e}, falling back to direct file download...", flush=True)

    # 2. Standalone file downloader fallback
    try:
        import urllib.request
        import json
        req = urllib.request.Request(f"{raw_base}/version.json", headers={'User-Agent': 'PhotoStudioAI-Updater'})
        with urllib.request.urlopen(req, timeout=10) as res:
            remote_info = json.loads(res.read().decode('utf-8'))
        
        files_to_update = remote_info.get('files_to_update', [
            'version.json', 'index.html', 'server.py', 'css/styles.css',
            'js/app.js', 'js/segmenter.js', 'js/face_crop.js', 'js/enhancer.js',
            'js/camera.js', 'js/eraser_tool.js', 'js/print_export.js'
        ])
        
        updated_files = []
        for rel_path in files_to_update:
            if rel_path == 'update_app.bat':
                continue
            file_url = f"{raw_base}/{rel_path}"
            target_path = os.path.join(BASE_DIR, rel_path.replace('/', os.sep))
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            f_req = urllib.request.Request(file_url, headers={'User-Agent': 'PhotoStudioAI-Updater'})
            with urllib.request.urlopen(f_req, timeout=15) as f_res:
                content = f_res.read()
                with open(target_path, 'wb') as out_f:
                    out_f.write(content)
            updated_files.append(rel_path)
            
        sync_dist_internal()
        return jsonify({
            'success': True,
            'message': f'PhotoStudio AI সফলভাবে v{remote_info.get("version", "")} এ আপডেট হয়েছে! পেজ রিফ্রেশ করুন।',
            'updated_files': updated_files
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'আপডেট ডাউনলোড ব্যর্থ হয়েছে: {str(e)}'
        }), 500

@app.route('/api/ai-compose', methods=['POST'])
def ai_compose():
    """
    AI Computer Compose & Document Generation API
    Accepts prompt, optional images (base64 or files), and optional Gemini API key.
    Calls official Google Gemini endpoint with models (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash).
    """
    try:
        import urllib.request
        import json
        import base64

        data = request.get_json(silent=True) or {}
        prompt = data.get('prompt') or request.form.get('prompt') or ''
        api_key = data.get('api_key') or request.form.get('api_key') or os.environ.get('GEMINI_API_KEY') or ''
        images = data.get('images') or []

        if not prompt and not images:
            return jsonify({'success': False, 'error': 'প্রম্পট অথবা ফাইল প্রয়োজন'}), 400

        if not api_key:
            return jsonify({
                'success': False,
                'error': 'Gemini API Key পাওয়া যায়নি। দয়া করে সেটিংস থেকে বিনামূল্যে Gemini API Key সেট করুন।'
            }), 400

        system_instruction = (
            "You are an elite, highly professional Bengali Computer Studio Composer and Document Specialist "
            "(কম্পিউটার দোকান ও স্টুডিও কম্পোজার). "
            "Your task is to produce 100% complete, formal documents in standard Bangladeshi official format (প্রমিত বাংলা). "
            "Output ONLY the final document with clean formatting ready for A4 printing: "
            "proper date, recipient (বরাবর), subject (বিষয়), salutation (জনাব/মহোদয়), body paragraphs, and signature blocks. "
            "If images or handwriting are attached, transcribe and format the text accurately with correct Bengali spelling. "
            "Do NOT include conversational filler like 'Here is your document:'. Output only the ready-to-print document text."
        )

        parts = [{"text": f"{system_instruction}\n\n[User Request]:\n{prompt}"}]

        for img in images:
            b64 = img.get('base64', '')
            mime = img.get('type', 'image/jpeg')
            if b64:
                parts.append({
                    "inline_data": {
                        "mime_type": mime,
                        "data": b64
                    }
                })

        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 2500
            }
        }

        models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash']
        last_error = None

        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key.strip()}"
            try:
                req_data = json.dumps(payload).encode('utf-8')
                req = urllib.request.Request(
                    url,
                    data=req_data,
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req, timeout=30) as res:
                    res_body = json.loads(res.read().decode('utf-8'))
                    candidates = res_body.get('candidates', [])
                    if candidates:
                        parts_out = candidates[0].get('content', {}).get('parts', [])
                        text_out = "\n".join([p.get('text', '') for p in parts_out if 'text' in p])
                        if text_out.strip():
                            return jsonify({'success': True, 'content': text_out})
            except Exception as e:
                last_error = str(e)
                print(f"[!] Compose model {model} attempt error: {e}", flush=True)

        return jsonify({'success': False, 'error': f'Gemini API কল ব্যর্থ হয়েছে: {last_error}'}), 502
    except Exception as e:
        print(f"[!] ai_compose exception: {e}", flush=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/remove-bg', methods=['POST'])
def remove_bg():
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image provided'}), 400

    try:
        session = get_rembg_session()
        if not session and HAS_REMBG is False:
            return jsonify({'error': 'rembg not available on server'}), 500

        import rembg
        input_image = Image.open(file.stream).convert('RGB')

        if session:
            output_image = rembg.remove(input_image, session=session)
        else:
            output_image = rembg.remove(input_image)

        buf = io.BytesIO()
        output_image.save(buf, format='PNG')
        buf.seek(0)
        return send_file(buf, mimetype='image/png')
    except Exception as e:
        print(f"[!] rembg processing error: {e}", file=sys.stderr, flush=True)
        return jsonify({'error': str(e)}), 500

def reconstruct_and_inpaint_skin(image_bytes, landmarks=None, box=None):
    """
    AI Skin & Face Reconstruction Pipeline (Studio Grade)
    Locates facial symmetry axis and cheek boundaries accurately.
    Detects peeled cardboard patches, scars, tears, and missing cheek/jaw areas.
    Restores missing facial anatomy by mirroring the healthy contralateral cheek with
    smooth Gaussian edge-blending — completely avoiding messy biharmonic smearing.
    Provides a seamless natural skin canvas for GFPGAN / RestoreFormer++ super-resolution.
    """
    try:
        import numpy as np
        from PIL import Image
        import scipy.ndimage as ndi
        from scipy.ndimage import gaussian_filter

        pil_img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        arr = np.array(pil_img, dtype=float)
        h, w, _ = arr.shape

        center_x = w // 2
        eye_y = int(h * 0.25)
        mouth_y = int(h * 0.65)
        r_eye_x = int(center_x - 0.2 * w)
        l_eye_x = int(center_x + 0.2 * w)

        if landmarks and len(landmarks) >= 3:
            try:
                r_eye = landmarks[0]
                l_eye = landmarks[1]
                nose = landmarks[2]
                if r_eye and l_eye and 'x' in r_eye and 'x' in l_eye:
                    center_x = int(((r_eye['x'] + l_eye['x']) / 2.0) * w)
                    eye_y = int(min(r_eye.get('y', 0.25), l_eye.get('y', 0.25)) * h)
                    r_eye_x = int(r_eye['x'] * w)
                    l_eye_x = int(l_eye['x'] * w)
                elif nose and 'x' in nose:
                    center_x = int(nose['x'] * w)

                if len(landmarks) > 3 and landmarks[3] and 'y' in landmarks[3]:
                    mouth_y = int(landmarks[3]['y'] * h)
            except Exception as e:
                print(f"[!] Error parsing landmarks: {e}", flush=True)
        elif box and isinstance(box, dict):
            try:
                center_x = int(box.get('xCenter', 0.5) * w)
                bh = box.get('height', 0.5) * h
                eye_y = int(box.get('yCenter', 0.4) * h - bh * 0.2)
                mouth_y = int(box.get('yCenter', 0.4) * h + bh * 0.3)
                r_eye_x = int(center_x - 0.2 * w)
                l_eye_x = int(center_x + 0.2 * w)
            except Exception as e:
                print(f"[!] Error parsing box: {e}", flush=True)

        # Cheek zones (left and right of nasal bridge)
        cheek_top = max(0, eye_y - 6)
        cheek_bottom = min(h, mouth_y + int(h * 0.15))
        cheek_w = int(w * 0.38)

        left_cheek_zone = np.zeros((h, w), dtype=bool)
        left_cheek_zone[cheek_top:cheek_bottom, max(0, center_x - cheek_w) : max(0, center_x - 6)] = True

        right_cheek_zone = np.zeros((h, w), dtype=bool)
        right_cheek_zone[cheek_top:cheek_bottom, min(w, center_x + 6) : min(w, center_x + cheek_w)] = True

        # Circular eyeball protection masks (protect pupils and irises)
        y_grid, x_grid = np.ogrid[:h, :w]
        eye_rad = max(4, int(w * 0.04))
        left_eye_mask = ((x_grid - r_eye_x)**2 + (y_grid - eye_y)**2) <= eye_rad**2
        right_eye_mask = ((x_grid - l_eye_x)**2 + (y_grid - eye_y)**2) <= eye_rad**2
        left_cheek_zone[left_eye_mask] = False
        right_cheek_zone[right_eye_mask] = False

        r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
        brightness = np.mean(arr, axis=-1)

        # Peeled cardboard, paper tears, scars, tape: high brightness + distinct warm yellow-tan paper tone (r > b + 15)
        is_peeled = (brightness > 160) & (r > b + 15)

        left_defects = np.sum(is_peeled & left_cheek_zone)
        right_defects = np.sum(is_peeled & right_cheek_zone)

        print(f"[*] [AI Skin Healer] Cheek defects: left={left_defects}, right={right_defects}, center_x={center_x}", flush=True)

        reconstructed = arr.copy()
        if left_defects > right_defects * 1.5 and left_defects > 100:
            # Left cheek is damaged! Mirror healthy right cheek to left cheek
            defect_mask = is_peeled & left_cheek_zone
            defect_mask = ndi.binary_dilation(defect_mask, iterations=3)
            for y in range(h):
                for x in range(center_x):
                    if defect_mask[y, x]:
                        src_x = center_x + (center_x - x)
                        if 0 <= src_x < w:
                            reconstructed[y, x] = arr[y, src_x]
            mask_smooth = gaussian_filter(defect_mask.astype(float), sigma=2.0)
            mask_3d = np.expand_dims(mask_smooth, axis=-1)
            reconstructed = (reconstructed * mask_3d + arr * (1.0 - mask_3d)).clip(0, 255)
            print(f"[OK] [AI Skin Healer] Mirrored healthy right cheek onto damaged left cheek ({left_defects} pixels)!", flush=True)
        elif right_defects > left_defects * 1.5 and right_defects > 100:
            # Right cheek is damaged! Mirror healthy left cheek to right cheek
            defect_mask = is_peeled & right_cheek_zone
            defect_mask = ndi.binary_dilation(defect_mask, iterations=3)
            for y in range(h):
                for x in range(center_x, w):
                    if defect_mask[y, x]:
                        src_x = center_x - (x - center_x)
                        if 0 <= src_x < w:
                            reconstructed[y, x] = arr[y, src_x]
            mask_smooth = gaussian_filter(defect_mask.astype(float), sigma=2.0)
            mask_3d = np.expand_dims(mask_smooth, axis=-1)
            reconstructed = (reconstructed * mask_3d + arr * (1.0 - mask_3d)).clip(0, 255)
            print(f"[OK] [AI Skin Healer] Mirrored healthy left cheek onto damaged right cheek ({right_defects} pixels)!", flush=True)
        else:
            print("[*] [AI Skin Healer] No severe unilateral defect detected, preserving original face for deep generative AI.", flush=True)
            return image_bytes

        out_pil = Image.fromarray(reconstructed.astype(np.uint8))
        out_buf = io.BytesIO()
        out_pil.save(out_buf, format='JPEG', quality=95)
        return out_buf.getvalue()
    except Exception as e:
        print(f"[!] Warning in reconstruct_and_inpaint_skin: {e}", flush=True)
        return image_bytes

@app.route('/api/heal-skin', methods=['POST'])
def heal_skin_api():
    """Standalone skin reconstruction & defect inpainting API"""
    file = request.files.get('image')
    if not file:
        return jsonify({'error': 'No image provided'}), 400
    try:
        reconstructed = reconstruct_and_inpaint_skin(file.read())
        buf = io.BytesIO(reconstructed)
        buf.seek(0)
        return send_file(buf, mimetype='image/jpeg')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restore-face', methods=['POST'])
def restore_face():
    """
    AI Face Restoration & Super-Resolution (CodeFormer / GFPGAN)
    Transforms blurry, damaged, or low-res portrait faces into crystal-clear HD studio portraits.
    Uses free Cloud AI (Hugging Face / Replicate) with offline local enhancement fallback.
    """
    import base64
    import json

    image_bytes = None
    file = request.files.get('image')
    if file:
        image_bytes = file.read()
    else:
        data = request.get_json(silent=True) or {}
        b64 = data.get('image_base64')
        if b64:
            if ',' in b64:
                b64 = b64.split(',', 1)[1]
            try:
                image_bytes = base64.b64decode(b64)
            except Exception:
                image_bytes = None

    if not image_bytes:
        return jsonify({'error': 'No image provided'}), 400

    # User settings
    mode = request.form.get('mode') or (request.get_json(silent=True) or {}).get('mode', 'blurry_face')
    repair_skin = request.form.get('repair_skin')
    if repair_skin is None:
        repair_skin = (request.get_json(silent=True) or {}).get('repair_skin', True)
    if isinstance(repair_skin, str):
        repair_skin = repair_skin.lower() in ('true', '1', 'yes')

    # Parse landmarks and face box if sent from client MediaPipe
    raw_landmarks = request.form.get('face_landmarks') or (request.get_json(silent=True) or {}).get('face_landmarks')
    landmarks = None
    if raw_landmarks:
        try:
            landmarks = json.loads(raw_landmarks) if isinstance(raw_landmarks, str) else raw_landmarks
        except Exception:
            landmarks = None

    raw_box = request.form.get('face_box') or (request.get_json(silent=True) or {}).get('face_box')
    box = None
    if raw_box:
        try:
            box = json.loads(raw_box) if isinstance(raw_box, str) else raw_box
        except Exception:
            box = None

    # For broken face, always ensure studio-grade skin reconstruction is performed to seal tears/cracks
    if repair_skin or mode == 'broken_face':
        image_bytes = reconstruct_and_inpaint_skin(image_bytes, landmarks=landmarks, box=box)

    fidelity = request.form.get('fidelity') or (request.get_json(silent=True) or {}).get('fidelity', 0.2 if mode == 'broken_face' else 0.6)
    try:
        fidelity = float(fidelity)
    except Exception:
        fidelity = 0.2 if mode == 'broken_face' else 0.6

    hf_token = request.form.get('hf_token') or (request.get_json(silent=True) or {}).get('hf_token')
    replicate_token = request.form.get('replicate_token') or (request.get_json(silent=True) or {}).get('replicate_token')

    restored_bytes = None
    cloud_error = None

    # Option A: Replicate API if user provided replicate token
    if replicate_token:
        try:
            import requests
            b64_str = base64.b64encode(image_bytes).decode('utf-8')
            uri = f"data:image/jpeg;base64,{b64_str}"
            rep_res = requests.post(
                "https://api.replicate.com/v1/predictions",
                headers={
                    "Authorization": f"Token {replicate_token.strip()}",
                    "Content-Type": "application/json"
                },
                json={
                    "version": "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                    "input": {
                        "image": uri,
                        "codeformer_fidelity": fidelity,
                        "background_enhance": True,
                        "face_upsample": True,
                        "upscale": 2
                    }
                },
                timeout=20
            )
            if rep_res.status_code in (200, 201):
                pred = rep_res.json()
                get_url = pred.get('urls', {}).get('get')
                for _ in range(40):
                    time.sleep(1)
                    poll = requests.get(get_url, headers={"Authorization": f"Token {replicate_token.strip()}"}, timeout=15).json()
                    if poll.get('status') == 'succeeded':
                        out_url = poll.get('output')
                        dl = requests.get(out_url, timeout=20)
                        if dl.status_code == 200:
                            restored_bytes = dl.content
                            break
                    elif poll.get('status') in ('failed', 'canceled'):
                        break
        except Exception as e:
            cloud_error = str(e)
            print(f"[!] Replicate error: {e}", flush=True)

    # Option B: Hugging Face AI Face Restoration Space (100% Free, No token required)
    if not restored_bytes:
        # Priority 1: avans06 space (verified running with GFPGAN, RestoreFormer++ & CodeFormer)
        hf_spaces = [
            {
                'base': 'https://avans06-image-face-upscale-restoration-gfpgan-re-05d4627.hf.space',
                'type': 'avans'
            },
            {
                'base': 'https://sczhou-codeformer.hf.space',
                'type': 'sczhou'
            }
        ]

        # For broken face, prioritize GFPGAN v1.4 and RestoreFormer++ (specialized in severe damage/crack reconstruction)
        if mode == 'broken_face':
            avans_models = ['GFPGANv1.4.pth', 'RestoreFormer++.ckpt', 'CodeFormer.pth']
        else:
            avans_models = ['CodeFormer.pth', 'RestoreFormer++.ckpt', 'GFPGANv1.4.pth']

        import requests
        for space in hf_spaces:
            if restored_bytes:
                break
            base_url = space['base']
            try:
                headers = {}
                if hf_token:
                    headers['Authorization'] = f"Bearer {hf_token.strip()}"

                files = {'files': ('face.jpg', io.BytesIO(image_bytes), 'image/jpeg')}
                up_res = requests.post(f'{base_url}/gradio_api/upload', files=files, headers=headers, timeout=25)
                if up_res.status_code != 200:
                    continue
                upload_list = up_res.json()
                remote_path = upload_list[0] if isinstance(upload_list, list) and upload_list else None
                if not remote_path:
                    continue

                if space['type'] == 'avans':
                    for m_name in avans_models:
                        if restored_bytes:
                            break
                        print(f"[*] Trying free online AI model: {m_name} (mode: {mode})...", flush=True)
                        payload = {
                            'data': [
                                [{'image': {'path': remote_path, 'meta': {'_type': 'gradio.FileData'}}, 'caption': None}],
                                m_name,
                                None,
                                2,
                                'retinaface_resnet50',
                                1.5,
                                False,
                                False,
                                True
                            ]
                        }
                        call_res = requests.post(f'{base_url}/gradio_api/call/inference', json=payload, headers=headers, timeout=25)
                        if call_res.status_code == 200:
                            event_id = call_res.json().get('event_id')
                            if event_id:
                                stream_res = requests.get(f'{base_url}/gradio_api/call/inference/{event_id}', stream=True, headers=headers, timeout=60)
                                for line in stream_res.iter_lines():
                                    if line:
                                        decoded = line.decode('utf-8')
                                        if decoded.startswith('data:'):
                                            raw = decoded[5:].strip()
                                            try:
                                                parsed = json.loads(raw)
                                                if isinstance(parsed, list) and len(parsed) > 0 and isinstance(parsed[0], list):
                                                    gallery = parsed[0]
                                                    target_item = gallery[-1]
                                                    for it in gallery:
                                                        p = it.get('image', {}).get('path', '')
                                                        if 'face.png' in p or p.endswith('face.png'):
                                                            target_item = it
                                                            break

                                                    img_info = target_item.get('image', {})
                                                    img_path = img_info.get('path')
                                                    img_url = img_info.get('url') or f'{base_url}/gradio_api/file={img_path}'
                                                    if img_url:
                                                        dl = requests.get(img_url, headers=headers, timeout=40)
                                                        if dl.status_code == 200 and len(dl.content) > 5000:
                                                            restored_bytes = dl.content
                                                            print(f"[OK] Online AI face restoration succeeded with {m_name}!", flush=True)
                                                            break
                                            except Exception:
                                                pass
                                            break
                elif space['type'] == 'sczhou':
                    payload = {
                        'data': [
                            {'path': remote_path, 'meta': {'_type': 'gradio.FileData'}},
                            False,
                            True,
                            True,
                            2,
                            fidelity
                        ]
                    }
                    call_res = requests.post(f'{base_url}/gradio_api/call/inference', json=payload, headers=headers, timeout=25)
                    if call_res.status_code == 200:
                        event_id = call_res.json().get('event_id')
                        if event_id:
                            stream_res = requests.get(f'{base_url}/gradio_api/call/inference/{event_id}', headers=headers, timeout=60)
                            for line in stream_res.text.splitlines():
                                if line.startswith('data:'):
                                    raw_json = line[5:].strip()
                                    try:
                                        parsed = json.loads(raw_json)
                                        if isinstance(parsed, list) and len(parsed) > 0:
                                            res_url = parsed[0].get('url') if isinstance(parsed[0], dict) else None
                                            if res_url:
                                                img_download = requests.get(res_url, headers=headers, timeout=25)
                                                if img_download.status_code == 200:
                                                    restored_bytes = img_download.content
                                                    break
                                    except Exception:
                                        pass
            except Exception as e:
                cloud_error = str(e)
                print(f"[!] HF Space {base_url} error: {e}", flush=True)

    if restored_bytes:
        buf = io.BytesIO(restored_bytes)
        buf.seek(0)
        return send_file(buf, mimetype='image/png')

    # Online AI Only (as requested: require active internet, do not run destructive local filters)
    err_msg = 'অনলাইন এআই ফেস রিস্টোরেশনের জন্য ইন্টারনেট সংযোগ প্রয়োজন। অনুগ্রহ করে ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।'
    if cloud_error:
        print(f"[!] Cloud restoration error: {cloud_error}", flush=True)
    return jsonify({'error': err_msg}), 503

def send_telemetry_ping():
    """
    Silent, non-blocking telemetry counter:
    - Increments the web analytics dashboard (hits.sh)
    - If Telegram credentials are configured, sends live notification to mobile
    """
    def _worker():
        try:
            import urllib.request
            import uuid
            import platform

            app_data = os.getenv('APPDATA') or os.path.expanduser('~')
            id_file = os.path.join(app_data, '.photostudioai_uid')
            uid = ''
            is_new = False
            if os.path.exists(id_file):
                try:
                    with open(id_file, 'r', encoding='utf-8') as f:
                        uid = f.read().strip()
                except Exception:
                    pass
            if not uid:
                uid = str(uuid.uuid4())[:8]
                is_new = True
                try:
                    with open(id_file, 'w', encoding='utf-8') as f:
                        f.write(uid)
                except Exception:
                    pass

            local_ver = '1.3.1'
            try:
                v_file = os.path.join(BASE_DIR, 'version.json')
                if os.path.exists(v_file):
                    with open(v_file, 'r', encoding='utf-8') as f:
                        local_ver = json.load(f).get('version', '1.3.1')
            except Exception:
                pass

            # 1. Ping the free hits.sh analytics dashboard
            analytics_url = f"https://hits.sh/photostudio-ai.telemy464-arch.github.io.svg?v={local_ver}&u={uid}"
            req = urllib.request.Request(
                analytics_url,
                headers={'User-Agent': f'PhotoStudioAI/{local_ver} ({platform.system()}; UID={uid})'}
            )
            urllib.request.urlopen(req, timeout=8)

            # 2. Telegram notification if configured in telemetry_config.json or env
            cfg_file = os.path.join(BASE_DIR, 'telemetry_config.json')
            tg_token = os.environ.get('TELEGRAM_BOT_TOKEN')
            tg_chat_id = os.environ.get('TELEGRAM_CHAT_ID')

            if os.path.exists(cfg_file):
                try:
                    with open(cfg_file, 'r', encoding='utf-8') as f:
                        cfg = json.load(f)
                        tg_token = cfg.get('telegram_bot_token') or tg_token
                        tg_chat_id = cfg.get('telegram_chat_id') or tg_chat_id
                except Exception:
                    pass

            if tg_token and tg_chat_id and 'YOUR_' not in tg_token and str(tg_chat_id).strip():
                user_status = "🆕 নতুন ইন্সটল / ১ম ব্যবহার" if is_new else "🔄 সক্রিয় ইউজার (Active User)"
                msg = (
                    f"🚀 *PhotoStudio AI চালু হয়েছে!*\n\n"
                    f"👤 অবস্থা: {user_status}\n"
                    f"🆔 ইউজার আইডি: `{uid}`\n"
                    f"🔖 সফটওয়্যার ভার্সন: v{local_ver}\n"
                    f"💻 অপারেটিং সিস্টেম: {platform.system()} {platform.release()}\n"
                    f"🌐 লাইভ ইউজার ড্যাশবোর্ড: https://hits.sh/photostudio-ai.telemy464-arch.github.io/"
                )
                tg_url = f"https://api.telegram.org/bot{tg_token}/sendMessage"
                payload = json.dumps({
                    'chat_id': str(tg_chat_id).strip(),
                    'text': msg,
                    'parse_mode': 'Markdown'
                }).encode('utf-8')
                tg_req = urllib.request.Request(
                    tg_url,
                    data=payload,
                    headers={'Content-Type': 'application/json'}
                )
                urllib.request.urlopen(tg_req, timeout=8)

        except Exception:
            pass

    threading.Thread(target=_worker, daemon=True).start()

@app.route('/api/telemetry-stats', methods=['GET'])
def get_telemetry_stats():
    return jsonify({
        'dashboard_url': 'https://hits.sh/photostudio-ai.telemy464-arch.github.io/',
        'badge_svg': 'https://hits.sh/photostudio-ai.telemy464-arch.github.io.svg'
    })

def find_free_port(start_port=8000):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('127.0.0.1', port)) != 0:
                return port
    return start_port

def launch_browser(port):
    """Wait for server to bind then launch the default browser reliably"""
    time.sleep(0.5)
    url = f"http://localhost:{port}"
    print(f"[*] [Browser] Opening {url} ...", flush=True)
    try:
        if sys.platform == 'win32':
            os.system(f'start "" "{url}"')
        else:
            webbrowser.open(url)
    except Exception as e:
        print(f"[!] Browser launch note: {e}", flush=True)
        webbrowser.open(url)

def main():
    os.chdir(BASE_DIR)
    port = find_free_port(8000)

    print("=" * 65, flush=True)
    print("  PhotoStudio AI - Passport & Stamp Photo Studio", flush=True)
    print("=" * 65, flush=True)
    print(f"  [+] Local server running at: http://localhost:{port}", flush=True)
    print("  [+] Opening application in your default browser...", flush=True)
    print("  [+] Please keep this window open while using the application.", flush=True)
    print("  [+] To close, press Ctrl+C or close this window.", flush=True)
    print("=" * 65, flush=True)

    # 1. Launch browser in background thread
    threading.Thread(target=launch_browser, args=(port,), daemon=True).start()

    # 2. Preload AI model in background thread
    preload_model_in_background()

    # 3. Silent telemetry counter (updates live web dashboard & sends Telegram alert if set)
    send_telemetry_ping()

    # 4. Start Flask server
    app.run(host='0.0.0.0', port=port, debug=False)

if __name__ == '__main__':
    main()
