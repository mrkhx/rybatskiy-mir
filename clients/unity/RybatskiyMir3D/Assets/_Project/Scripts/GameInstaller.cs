using RybatskiyMir.Audio;
using RybatskiyMir.Cam;
using RybatskiyMir.Fishing;
using RybatskiyMir.Hud;
using RybatskiyMir.Input;
using RybatskiyMir.Net;
using RybatskiyMir.Player;
using RybatskiyMir.World;
using UnityEngine;

namespace RybatskiyMir
{
    public class GameInstaller : MonoBehaviour
    {
        public string ApiBaseUrl = "http://127.0.0.1:3000";
        public string DevVkId = "910001";
        public bool AllowDevAuth = true;

        ApiClient _api;
        FishingDirector _fishing;
        PlayerInputReader _input;
        FishermanController _mover;
        HudOverlay _hud;
        Transform _prompt;
        Atmosphere _atmo;

        async void Start()
        {
            Cursor.lockState = CursorLockMode.Locked;
            Cursor.visible = false;
            _api = new ApiClient { BaseUrl = ApiBaseUrl };
            var auth = new AuthClient(_api);
            var fishing = new FishingClient(_api);
            var world = new WorldClient(_api);
            var profile = new ProfileClient(_api);
            if (AllowDevAuth)
            {
                try { await auth.DevLogin(DevVkId, "Рыбак"); }
                catch (System.Exception e) { Debug.LogWarning("Dev login failed: " + e.Message); }
            }

            ForestLakeBuilder.Build(transform);

            _input = gameObject.AddComponent<PlayerInputReader>();
            var player = CreateFisherman();
            _mover = player.GetComponent<FishermanController>();
            _mover.Input = _input;

            var camGo = new GameObject("OrbitCamera");
            var cam = camGo.AddComponent<Camera>();
            cam.tag = "MainCamera";
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.55f, 0.72f, 0.8f);
            cam.nearClipPlane = 0.12f;
            cam.farClipPlane = QualityTier.ViewDistance;
            cam.fieldOfView = 58f;
            var orbit = camGo.AddComponent<OrbitCamera>();
            orbit.Target = player.transform;
            orbit.Input = _input;
            _mover.CameraPivot = camGo.transform;
            camGo.AddComponent<AudioListener>();
            orbit.SnapBehind();
            camGo.transform.position = player.transform.position - player.transform.forward * 4.8f + Vector3.up * 1.7f;

            var body = player.GetComponent<FishermanBody>();
            var gear = FishingGear.Build(body.RightHand);
            _fishing = gameObject.AddComponent<FishingDirector>();
            _fishing.Client = fishing;
            _fishing.Input = _input;
            _fishing.Mover = _mover;
            _fishing.Body = body;
            _fishing.Cam = orbit;
            _fishing.Gear = gear;
            _fishing.SitPoint = ForestLakeBuilder.SitPoint;
            _fishing.LookOut = ForestLakeBuilder.LookOut;
            _fishing.WaterY = ForestLakeBuilder.WaterY;
            _fishing.Splash = BuildSplash();

            _hud = gameObject.AddComponent<HudOverlay>();
            _hud.Fishing = _fishing;

            var audio = gameObject.AddComponent<WorldAudio>();
            audio.Build(LakeWater.Instance ? LakeWater.Instance.transform : transform);

            _atmo = gameObject.AddComponent<Atmosphere>();
            _atmo.Build(ForestLakeBuilder.Sun);

            if (ForestLakeBuilder.SitPoint)
                _prompt = ForestLakeBuilder.SitPoint.Find("InteractPrompt");

            try
            {
                var snap = await world.Snapshot();
                if (snap?.clock != null) _atmo.Apply(snap.clock.timeOfDay, snap.clock.weather);
                var me = await profile.Me();
                if (me != null) Debug.Log("Profile " + me.nickname + " lv " + me.stats?.level);
            }
            catch (System.Exception e) { Debug.LogWarning("World/profile: " + e.Message); }
        }

        void Update()
        {
            if (_fishing == null || _mover == null) return;
            if (_fishing.Active)
            {
                if (_hud) _hud.NearSpot = false;
                if (_prompt) _prompt.gameObject.SetActive(false);
                return;
            }

            var sit = ForestLakeBuilder.SitPoint;
            if (!sit) return;
            var near = Vector3.Distance(_mover.transform.position, sit.position) < 2.4f;
            if (_hud) _hud.NearSpot = near;
            if (_prompt)
            {
                _prompt.gameObject.SetActive(near);
                if (near && Camera.main)
                    _prompt.rotation = Quaternion.LookRotation(_prompt.position - Camera.main.transform.position);
            }
            if (near && _input.InteractPressed) _ = _fishing.Begin();
        }

        GameObject CreateFisherman()
        {
            var root = new GameObject("Fisherman");
            root.transform.position = new Vector3(0, 0.05f, 1.8f);
            var cc = root.AddComponent<CharacterController>();
            cc.height = 1.78f;
            cc.radius = 0.26f;
            cc.center = new Vector3(0, 0.9f, 0);
            cc.slopeLimit = 45f;
            cc.stepOffset = 0.3f;
            var body = FishermanBody.Build(root.transform);
            var mover = root.AddComponent<FishermanController>();
            mover.Body = body;
            return root;
        }

        ParticleSystem BuildSplash()
        {
            var go = new GameObject("Splash");
            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.startLifetime = 0.5f;
            main.startSpeed = 1.6f;
            main.startSize = 0.07f;
            main.startColor = new Color(0.85f, 0.92f, 0.95f, 0.75f);
            main.playOnAwake = false;
            main.gravityModifier = 0.8f;
            main.maxParticles = 40;
            var sh = ps.shape;
            sh.shapeType = ParticleSystemShapeType.Hemisphere;
            sh.radius = 0.16f;
            var em = ps.emission;
            em.SetBursts(new[] { new ParticleSystem.Burst(0f, 18) });
            em.rateOverTime = 0;
            return ps;
        }
    }
}
