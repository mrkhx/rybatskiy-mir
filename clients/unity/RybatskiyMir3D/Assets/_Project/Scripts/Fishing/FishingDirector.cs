using System.Threading.Tasks;
using RybatskiyMir.Audio;
using RybatskiyMir.Cam;
using RybatskiyMir.Input;
using RybatskiyMir.Net;
using RybatskiyMir.Player;
using RybatskiyMir.World;
using UnityEngine;

namespace RybatskiyMir.Fishing
{
    public class FishingDirector : MonoBehaviour
    {
        public FishingClient Client;
        public PlayerInputReader Input;
        public FishermanController Mover;
        public FishermanBody Body;
        public OrbitCamera Cam;
        public FishingGear Gear;
        public Transform SitPoint;
        public Transform LookOut;
        public ParticleSystem Splash;
        public float WaterY = 0.15f;
        public float DepthM = 1.4f;

        public SessionDto Session { get; private set; }
        public bool Active { get; private set; }
        public string Status = "Подойдите к старому мостику.";
        public float Tension => Session?.tension ?? 0;

        Vector3 _standPos;
        Quaternion _standRot;
        float _force = 0.6f;
        float _aimYaw;
        float _biteTimer;
        float _tickTimer;
        Vector3 _floatPos;
        Vector3 _fishPos;
        float _lureT = 1f;
        Vector3 _lureFrom;
        Vector3 _lureTo;
        bool _busy;
        bool _casting;
        float _hookFlash;

        public async Task Begin()
        {
            if (Active || _busy) return;
            _busy = true;
            try
            {
                Session = await Client.Start("old-bridge", "FLOAT");
                Active = true;
                _standPos = Mover.transform.position;
                _standRot = Mover.transform.rotation;
                _aimYaw = 0f;
                _force = 0.6f;
                _lureT = 1f;
                _casting = false;
                _biteTimer = 0f;
                _tickTimer = 0f;
                Mover.Locked = true;
                var sitRot = Quaternion.LookRotation(AimDir(), Vector3.up);
                Mover.Teleport(SitPoint.position, sitRot);
                if (Cam)
                {
                    Cam.FishingLook = LookOut;
                    Cam.EnterFishing();
                }
                Gear.Equip(Body ? Body.RightHand : null);
                Gear.BendRod(0.05f);
                var hold = CastTarget(1.2f);
                _floatPos = hold;
                _floatPos.y = WaterY;
                Gear.AimAt(hold);
                if (Body) Body.Pose = FishermanPose.Sit;
                Status = Session.playerHint ?? "Прицельтесь и забросьте.";
            }
            catch (System.Exception e)
            {
                Status = e.Message;
                Active = false;
                Mover.Locked = false;
            }
            _busy = false;
        }

        public async Task End()
        {
            if (!Active) return;
            Active = false;
            Mover.Locked = false;
            Mover.Teleport(_standPos, _standRot);
            if (Cam) Cam.ExitFishing();
            Gear.ClearAim();
            Gear.Holster(Body ? Body.Spine : null);
            if (Body) Body.Pose = FishermanPose.Idle;
            Status = "Свободное перемещение.";
            Session = null;
            await Task.CompletedTask;
        }

        void Update()
        {
            if (!Active || Session == null) return;
            var st = Session.state;
            if (st == "READY" || st == "IDLE") TickReady();
            else if (st == "WAITING_BITE") TickWait();
            else if (st == "BITE") TickBite();
            else if (st == "HOOKED" || st == "FIGHTING") TickFight();
            else if (st == "LANDED") TickLanded();
            else if (st == "LOST" || st == "BROKEN")
            {
                Status = Session.loseReason ?? "Сход";
                Gear.SetVisible(true, false, false, false);
                Gear.AimAt(CastTarget(1.2f));
                FaceWater();
                if (Body) Body.Pose = FishermanPose.Sit;
                if (WantCast()) _ = End();
            }

            if (_hookFlash > 0f) _hookFlash -= Time.deltaTime;
            AnimateView();
        }

        bool WantCast() => Input != null && (Input.CastPressed || Input.JumpPressed);

        void TickReady()
        {
            if (Body) Body.Pose = FishermanPose.Aim;
            _aimYaw += Input.Look.x * 0.35f;
            _aimYaw = Mathf.Clamp(_aimYaw, -55f, 55f);
            _force = Mathf.Clamp01(_force + Input.Move.y * Time.deltaTime * 0.35f);
            Status = $"Сила {Mathf.RoundToInt(_force * 100)}%  ·  ЛКМ / Пробел заброс  ·  R встать";
            Gear.BendRod(0.08f + _force * 0.18f);
            var hold = CastTarget(1.25f);
            _floatPos = hold;
            _floatPos.y = WaterY;
            Gear.AimAt(hold);
            FaceWater();
            if (WantCast() && !_casting) _ = DoCast();
            if (Input.CancelPressed) _ = End();
        }

        async Task DoCast()
        {
            if (_busy) return;
            _busy = true;
            _casting = true;
            if (Body)
            {
                Body.Pose = FishermanPose.Cast;
                Body.CastT = 0;
            }
            WorldAudio.I?.PlayCast(Mover.transform.position);
            var waterTarget = CastTarget(0f);
            var origin = SitPoint ? SitPoint.position : Mover.transform.position;
            // High lift, barely behind — not a shore-pointing back-cast.
            var windup = origin + Vector3.up * 4.05f - AimDir() * 0.28f;
            Gear.AimAt(windup);
            float t = 0;
            while (t < 0.42f)
            {
                t += Time.deltaTime;
                if (Body) Body.CastT = t / 0.7f;
                Gear.BendRod(0.25f + t);
                if (t > 0.18f)
                {
                    var k = Mathf.Clamp01((t - 0.18f) / 0.24f);
                    Gear.AimAt(Vector3.Lerp(windup, waterTarget + Vector3.up * 1.35f, k));
                }
                await Task.Yield();
            }

            _lureFrom = Gear.TipPos;
            _lureTo = waterTarget;
            _lureTo.y = WaterY;
            _lureT = 0;
            Gear.SetVisible(true, true, false, false);

            try
            {
                Session = await Client.Cast(_force, _aimYaw * Mathf.Deg2Rad, DepthM);
                Status = Session.playerHint ?? "Ждём поклёвку…";
            }
            catch (System.Exception e) { Status = e.Message; }

            while (_lureT < 1f) await Task.Yield();
            if (Body)
            {
                Body.CastT = 1f;
                Body.Pose = FishermanPose.Wait;
            }
            _casting = false;
            _busy = false;
        }

        void TickWait()
        {
            if (Body) Body.Pose = FishermanPose.Wait;
            _biteTimer += Time.deltaTime;
            if (_biteTimer > 0.9f && !_busy)
            {
                _biteTimer = 0;
                _ = PollBite();
            }
            var wave = LakeWater.Instance ? LakeWater.Instance.SampleHeight(_floatPos) : WaterY + Mathf.Sin(Time.time * 1.6f) * 0.04f;
            _floatPos.y = wave;
            Gear.BendRod(0.07f);
            Gear.AimAt(WaterAim(_floatPos));
            FaceWater();
            if (WantCast() && !_busy) _ = DoCast();
        }

        async Task PollBite()
        {
            _busy = true;
            try
            {
                Session = await Client.Bite();
                if (Session.state == "BITE") Status = "Поклёвка! Подсекайте.";
                else if (!string.IsNullOrEmpty(Session.playerHint)) Status = Session.playerHint;
            }
            catch { }
            _busy = false;
        }

        void TickBite()
        {
            if (Body) Body.Pose = FishermanPose.Wait;
            var baseY = LakeWater.Instance ? LakeWater.Instance.SampleHeight(_floatPos) : WaterY;
            _floatPos.y = baseY - 0.1f - Mathf.Abs(Mathf.Sin(Time.time * 9f)) * 0.16f;
            _floatPos += new Vector3(Mathf.Sin(Time.time * 11f), 0, Mathf.Cos(Time.time * 8f)) * 0.012f;
            Gear.BendRod(0.22f);
            Gear.AimAt(WaterAim(_floatPos));
            FaceWater();
            if (WantCast()) _ = DoHook();
        }

        async Task DoHook()
        {
            if (_busy) return;
            _busy = true;
            _hookFlash = 0.35f;
            if (Body) Body.Pose = FishermanPose.Hook;
            if (Cam) Cam.AddImpulse(-Mover.transform.forward * 0.18f + Vector3.up * 0.08f);
            WorldAudio.I?.PlayCast(Mover.transform.position);
            try
            {
                Session = await Client.Hook(80);
                Status = Session.state is "FIGHTING" or "HOOKED"
                    ? "Держите натяжение.  W/S давление  ·  Shift подмотка"
                    : Session.playerHint;
            }
            catch (System.Exception e) { Status = e.Message; }
            _busy = false;
        }

        void TickFight()
        {
            if (Body)
            {
                Body.Pose = FishermanPose.Fight;
                Body.Tension = Session.tension;
            }
            _tickTimer += Time.deltaTime;
            if (_tickTimer > 0.42f && !_busy)
            {
                _tickTimer = 0;
                _ = DoTick();
            }
            var t = Session.tension;
            Gear.BendRod(0.35f + t * 0.6f);
            var yank = Mathf.Sin(Time.time * (2.5f + t * 4f));
            var progress = Session.fightProgress;
            _fishPos = _floatPos + new Vector3(yank * 1.6f, -0.55f - (1f - progress) * 0.9f, yank * 0.5f + progress * 0.8f);
            Gear.AimAt(WaterAim(_fishPos));
            FaceWater();
            if (Mathf.Abs(yank) > 0.85f && Cam) Cam.AddImpulse(Mover.transform.right * yank * 0.04f);
            if (_fishPos.y > WaterY - 0.08f && Random.value < t * 0.04f) SplashOnce(_fishPos);
            if (Input.Sprint && Time.frameCount % 18 == 0) WorldAudio.I?.PlayReel(Mover.transform.position);
        }

        async Task DoTick()
        {
            _busy = true;
            try
            {
                var reel = Mathf.Clamp01(0.45f + Input.ReelAxis * 0.5f + (Input.Sprint ? 0.25f : 0f));
                var pressure = Mathf.Clamp01(0.5f + Input.Move.y * 0.3f);
                Session = await Client.Tick(reel, pressure, Input.Move.x, 0.42f);
                if (Session.state == "LANDED")
                    Status = $"Улов · {Session.weightG} г · {Session.tier}  ·  ЛКМ в садок  ·  R отпустить";
                else if (Session.state is "LOST" or "BROKEN")
                    Status = Session.loseReason ?? "Сход";
            }
            catch (System.Exception e) { Status = e.Message; }
            _busy = false;
        }

        void TickLanded()
        {
            if (Body) Body.Pose = FishermanPose.Land;
            Gear.BendRod(0.12f);
            var land = SitPoint.position + AimDir() * 1.15f + Vector3.up * 0.55f;
            _fishPos = Vector3.Lerp(_fishPos, land, Time.deltaTime * 2.2f);
            Gear.AimAt(_fishPos + Vector3.up * 0.25f);
            FaceWater();
            if (WantCast()) _ = Decide(true);
            if (Input.CancelPressed) _ = Decide(false);
        }

        async Task Decide(bool keep)
        {
            if (_busy) return;
            _busy = true;
            try { Session = await Client.Decide(keep); }
            catch { }
            _busy = false;
            await End();
        }

        void AnimateView()
        {
            if (_lureT < 1f)
            {
                _lureT += Time.deltaTime / 0.85f;
                var t = Mathf.Clamp01(_lureT);
                if (Body) Body.CastT = 0.42f + t * 0.58f;
                var pos = Vector3.Lerp(_lureFrom, _lureTo, t);
                pos.y += Mathf.Sin(t * Mathf.PI) * 3.2f;
                Gear.AimAt(pos);
                Gear.DrawLine(Gear.TipPos, pos, 0.12f * (1 - t));
                Gear.BendRod(0.15f + (1 - t) * 0.2f);
                if (t >= 1f)
                {
                    _floatPos = _lureTo;
                    Gear.SetVisible(true, true, true, false);
                    SplashOnce(_floatPos);
                    LakeWater.Instance?.Pulse(_floatPos);
                    WaterRipple.Spawn(_floatPos, 0.55f);
                }
                return;
            }

            var st = Session?.state;
            if (st is "WAITING_BITE" or "BITE")
            {
                if (Gear.Float)
                {
                    Gear.Float.position = Vector3.Lerp(Gear.Float.position, _floatPos, Time.deltaTime * 8f);
                    Gear.Float.rotation = Quaternion.Euler(Mathf.Sin(Time.time * 2f) * 8f, 0, Mathf.Cos(Time.time * 1.6f) * 6f);
                }
                Gear.DrawLine(Gear.TipPos, _floatPos, st == "BITE" ? 0.04f : 0.32f);
                Gear.SetVisible(true, true, true, false);
            }
            else if (st is "HOOKED" or "FIGHTING")
            {
                if (Gear.Fish) Gear.Fish.position = Vector3.Lerp(Gear.Fish.position, _fishPos, Time.deltaTime * 6f);
                Gear.DrawLine(Gear.TipPos, Gear.Fish ? Gear.Fish.position : _fishPos, 0.02f);
                Gear.SetVisible(true, true, false, true);
            }
            else if (st == "LANDED")
            {
                if (Gear.Fish) Gear.Fish.position = _fishPos;
                Gear.DrawLine(Gear.TipPos, _fishPos, 0.08f);
                Gear.SetVisible(true, true, false, true);
            }
            else if (st is "READY" or "IDLE")
            {
                Gear.SetVisible(true, false, false, false);
            }
        }

        Vector3 AimDir()
        {
            var fwd = SitPoint ? SitPoint.forward : (Mover ? Mover.transform.forward : Vector3.forward);
            fwd.y = 0f;
            if (fwd.sqrMagnitude < 0.0001f) fwd = Vector3.forward;
            return Quaternion.Euler(0f, _aimYaw, 0f) * fwd.normalized;
        }

        Vector3 CastTarget(float extraY)
        {
            var origin = SitPoint ? SitPoint.position : (Mover ? Mover.transform.position : Vector3.zero);
            var p = origin + AimDir() * (8f + _force * 10f);
            p.y = WaterY + extraY;
            return p;
        }

        Vector3 WaterAim(Vector3 surface)
        {
            var origin = SitPoint ? SitPoint.position : (Mover ? Mover.transform.position : Vector3.zero);
            var fwd = AimDir();
            var p = surface;
            var to = p - origin;
            to.y = 0f;
            if (to.sqrMagnitude < 1f || Vector3.Dot(to, fwd) < 1.2f)
                p = origin + fwd * 8f;
            p.y = Mathf.Max(surface.y, WaterY) + 1.35f;
            return p;
        }

        void FaceWater()
        {
            if (!Mover) return;
            var dir = AimDir();
            dir.y = 0f;
            if (dir.sqrMagnitude < 0.0001f) return;
            var want = Quaternion.LookRotation(dir.normalized, Vector3.up);
            Mover.transform.rotation = Quaternion.Slerp(
                Mover.transform.rotation,
                want,
                1f - Mathf.Exp(-8f * Time.deltaTime));
        }

        void SplashOnce(Vector3 p)
        {
            if (Splash)
            {
                Splash.transform.position = p;
                Splash.Play();
            }
            WorldAudio.I?.PlaySplash(p);
            WaterRipple.Spawn(p, 0.5f);
        }
    }
}
