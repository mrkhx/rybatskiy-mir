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
        public const int PlayerLayer = 8;
        public string ApiBaseUrl = "http://127.0.0.1:3000";
        public string DevVkId = "910001";
        public bool AllowDevAuth = true;

        ApiClient _api;
        FishingDirector _fishing;
        PlayerInputReader _input;
        FishermanController _mover;
        HudOverlay _hud;
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
            cam.backgroundColor = Palette.FogDay;
            cam.nearClipPlane = 0.12f;
            cam.farClipPlane = QualityTier.ViewDistance;
            cam.fieldOfView = 56f;
            cam.allowMSAA = true;
            cam.allowHDR = true;
            var orbit = camGo.AddComponent<OrbitCamera>();
            orbit.Target = player.transform;
            orbit.Input = _input;
            orbit.Cam = cam;
            orbit.CollisionMask = ~(1 << PlayerLayer);
            _mover.CameraPivot = camGo.transform;
            camGo.AddComponent<AudioListener>();
            orbit.SnapBehind();
            camGo.transform.position = player.transform.position - player.transform.forward * 4.6f + Vector3.up * 1.7f;

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
            orbit.FishingLook = ForestLakeBuilder.LookOut;

            _hud = gameObject.AddComponent<HudOverlay>();
            _hud.Fishing = _fishing;
            _hud.Input = _input;

            var audio = gameObject.AddComponent<WorldAudio>();
            audio.Build(LakeWater.Instance ? LakeWater.Instance.transform : transform);

            _atmo = gameObject.AddComponent<Atmosphere>();
            _atmo.Build(ForestLakeBuilder.Sun);
            _hud.Atmo = _atmo;

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
                return;
            }

            var sit = ForestLakeBuilder.SitPoint;
            if (!sit) return;
            var near = Vector3.Distance(_mover.transform.position, sit.position) < 2.6f;
            if (_hud) _hud.NearSpot = near;
            if (near && _input.InteractPressed) _ = _fishing.Begin();
        }

        GameObject CreateFisherman()
        {
            var root = new GameObject("Fisherman");
            root.transform.position = ForestLakeBuilder.SpawnPos;
            var cc = root.AddComponent<CharacterController>();
            cc.height = 1.78f;
            cc.radius = 0.28f;
            cc.center = new Vector3(0, 0.9f, 0);
            cc.slopeLimit = 48f;
            cc.stepOffset = 0.32f;
            cc.skinWidth = 0.08f;
            var body = FishermanBody.Build(root.transform);
            var mover = root.AddComponent<FishermanController>();
            mover.Body = body;
            MeshUtil.SetLayerRecursively(root, PlayerLayer);
            return root;
        }

        ParticleSystem BuildSplash()
        {
            var go = new GameObject("Splash");
            var ps = go.AddComponent<ParticleSystem>();
            var main = ps.main;
            main.startLifetime = 0.55f;
            main.startSpeed = 1.8f;
            main.startSize = 0.06f;
            main.startColor = new Color(0.86f, 0.93f, 0.96f, 0.72f);
            main.playOnAwake = false;
            main.gravityModifier = 0.85f;
            main.maxParticles = 48;
            var sh = ps.shape;
            sh.shapeType = ParticleSystemShapeType.Hemisphere;
            sh.radius = 0.18f;
            var em = ps.emission;
            em.SetBursts(new[] { new ParticleSystem.Burst(0f, 22) });
            em.rateOverTime = 0;
            var rend = go.GetComponent<ParticleSystemRenderer>();
            rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            return ps;
        }
    }
}
