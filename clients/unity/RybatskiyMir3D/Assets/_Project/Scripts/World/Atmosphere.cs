using UnityEngine;
using UnityEngine.Rendering;

namespace RybatskiyMir.World
{
    /// <summary>
    /// Day / evening / night lighting + CLEAR / RAIN / storm presentation.
    /// Driven by backend world clock, never invents bite weather internally.
    /// </summary>
    public class Atmosphere : MonoBehaviour
    {
        Light _sun;
        ParticleSystem _rain;
        ParticleSystemRenderer _rainRend;
        float _flash;
        string _weather = "CLEAR";
        string _tod = "DAY";
        Material _skyMat;
        Color _baseSun = Palette.SunDay;
        float _baseIntensity = 1.18f;

        public void Build(Light sun)
        {
            _sun = sun;
            var dome = GameObject.Find("SkyDome");
            if (dome) _skyMat = dome.GetComponent<MeshRenderer>()?.sharedMaterial;

            var rainGo = new GameObject("Rain");
            rainGo.transform.SetParent(transform, false);
            _rain = rainGo.AddComponent<ParticleSystem>();
            var main = _rain.main;
            main.startLifetime = 0.85f;
            main.startSpeed = 16f;
            main.startSize = 0.035f;
            main.startColor = new Color(0.72f, 0.80f, 0.86f, 0.42f);
            main.maxParticles = QualityTier.Rain ? 1800 : 0;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            main.gravityModifier = 0.35f;
            var em = _rain.emission;
            em.rateOverTime = 0;
            var sh = _rain.shape;
            sh.shapeType = ParticleSystemShapeType.Box;
            sh.scale = new Vector3(28f, 2f, 28f);
            var vol = _rain.velocityOverLifetime;
            vol.enabled = true;
            vol.y = -14f;
            vol.x = 2.5f;
            _rainRend = rainGo.GetComponent<ParticleSystemRenderer>();
            _rainRend.renderMode = ParticleSystemRenderMode.Stretch;
            _rainRend.lengthScale = 3.6f;
            _rainRend.velocityScale = 0.08f;
            _rainRend.shadowCastingMode = ShadowCastingMode.Off;
            var rainMat = MeshUtil.Unlit(new Color(0.75f, 0.82f, 0.88f, 0.35f));
            rainMat.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
            rainMat.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
            rainMat.SetInt("_ZWrite", 0);
            rainMat.renderQueue = 3200;
            _rainRend.sharedMaterial = rainMat;
            Apply("DAY", "CLEAR");
        }

        public void Apply(string timeOfDay, string weather)
        {
            _tod = timeOfDay ?? "DAY";
            _weather = weather ?? "CLEAR";
            var storm = IsStorm;
            var rain = storm || _weather == "RAIN";
            var night = _tod is "NIGHT" or "DUSK";
            var evening = _tod is "EVENING" or "DAWN";

            Color sunCol = Palette.SunDay;
            float intensity = 1.18f;
            var sunEuler = new Vector3(38f, 128f, 0);
            Color fog = Palette.FogDay;
            Color sky = new Color(0.58f, 0.72f, 0.80f);
            Color horizon = Palette.SkyDay;
            Color zenith = Palette.SkyZenith;
            float fogStart = QualityTier.FogStart;
            float fogEnd = QualityTier.FogEnd;

            if (evening)
            {
                sunCol = new Color(1f, 0.70f, 0.42f);
                intensity = 0.82f;
                sunEuler = new Vector3(14f, 162f, 0);
                fog = new Color(0.72f, 0.52f, 0.40f);
                sky = new Color(0.78f, 0.50f, 0.34f);
                horizon = new Color(0.90f, 0.62f, 0.40f);
                zenith = new Color(0.28f, 0.32f, 0.48f);
                fogStart *= 0.75f;
            }
            else if (night)
            {
                sunCol = new Color(0.55f, 0.62f, 0.85f);
                intensity = 0.16f;
                sunEuler = new Vector3(-6f, 200f, 0);
                fog = new Color(0.08f, 0.11f, 0.16f);
                sky = new Color(0.05f, 0.07f, 0.12f);
                horizon = new Color(0.10f, 0.12f, 0.18f);
                zenith = new Color(0.02f, 0.03f, 0.07f);
                fogStart *= 0.45f;
                fogEnd *= 0.55f;
            }

            if (rain)
            {
                intensity *= 0.55f;
                sunCol = Color.Lerp(sunCol, new Color(0.62f, 0.68f, 0.72f), 0.55f);
                fog = Color.Lerp(fog, new Color(0.38f, 0.44f, 0.48f), 0.65f);
                sky = Color.Lerp(sky, new Color(0.30f, 0.36f, 0.40f), 0.55f);
                horizon = Color.Lerp(horizon, new Color(0.42f, 0.48f, 0.52f), 0.6f);
                zenith = Color.Lerp(zenith, new Color(0.22f, 0.26f, 0.30f), 0.5f);
                fogStart *= 0.55f;
                fogEnd *= 0.65f;
            }

            _baseSun = sunCol;
            _baseIntensity = intensity;

            if (_sun)
            {
                _sun.color = sunCol;
                _sun.intensity = intensity;
                _sun.transform.rotation = Quaternion.Euler(sunEuler);
                _sun.shadows = QualityTier.SoftShadows ? LightShadows.Soft : LightShadows.None;
            }

            if (ForestLakeBuilder.Fill)
            {
                ForestLakeBuilder.Fill.intensity = rain ? 0.22f : 0.16f;
                ForestLakeBuilder.Fill.color = rain
                    ? new Color(0.45f, 0.52f, 0.58f)
                    : new Color(0.55f, 0.68f, 0.78f);
            }

            RenderSettings.fog = true;
            RenderSettings.fogColor = fog;
            RenderSettings.fogMode = FogMode.Linear;
            RenderSettings.fogStartDistance = fogStart;
            RenderSettings.fogEndDistance = fogEnd;
            RenderSettings.ambientSkyColor = sky;
            RenderSettings.ambientEquatorColor = Color.Lerp(sky, new Color(0.32f, 0.40f, 0.30f), 0.45f);
            RenderSettings.ambientGroundColor = new Color(0.12f, 0.11f, 0.08f);
            if (Camera.main) Camera.main.backgroundColor = fog;

            if (_skyMat)
            {
                if (_skyMat.HasProperty("_Horizon")) _skyMat.SetColor("_Horizon", horizon);
                if (_skyMat.HasProperty("_Zenith")) _skyMat.SetColor("_Zenith", zenith);
                var dir = Quaternion.Euler(sunEuler) * Vector3.forward;
                if (_skyMat.HasProperty("_SunDir")) _skyMat.SetVector("_SunDir", dir);
                if (_skyMat.HasProperty("_SunColor")) _skyMat.SetColor("_SunColor", sunCol);
            }

            if (LakeWater.Instance) LakeWater.Instance.RainAmount = rain ? (storm ? 1f : 0.55f) : 0f;

            if (_rain)
            {
                var em = _rain.emission;
                em.rateOverTime = !QualityTier.Rain || !rain ? 0 : storm ? 1100 : 520;
            }
        }

        bool IsStorm => _weather is "STORM" or "DOWNPOUR" or "THUNDERSTORM";

        void LateUpdate()
        {
            if (_rain && Camera.main)
            {
                var cam = Camera.main.transform;
                _rain.transform.position = cam.position + Vector3.up * 7f + cam.forward * 6f;
            }

            var storm = IsStorm;
            if (storm && Random.value < 0.0035f) _flash = 1f;
            if (_flash > 0f)
            {
                _flash -= Time.deltaTime * 3.2f;
                if (_sun) _sun.intensity = _baseIntensity + Mathf.Max(0f, _flash) * 3.4f;
                RenderSettings.ambientSkyColor += Color.white * _flash * 0.28f;
            }
            else if (_sun)
            {
                _sun.intensity = Mathf.Lerp(_sun.intensity, _baseIntensity, Time.deltaTime * 4f);
                _sun.color = Color.Lerp(_sun.color, _baseSun, Time.deltaTime * 4f);
            }

            if ((_weather == "RAIN" || storm) && QualityTier.Rain && Random.value < 0.12f)
            {
                var p = ForestLakeBuilder.LakeCenter + new Vector3(Random.Range(-10f, 10f), 0, Random.Range(-10f, 10f));
                p.y = ForestLakeBuilder.WaterY;
                WaterRipple.Spawn(p, 0.28f + Random.value * 0.2f);
            }
        }
    }
}
