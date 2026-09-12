using UnityEngine;

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
        float _flash;
        string _weather = "CLEAR";
        string _tod = "DAY";

        public void Build(Light sun)
        {
            _sun = sun;
            var rainGo = new GameObject("Rain");
            rainGo.transform.SetParent(transform, false);
            _rain = rainGo.AddComponent<ParticleSystem>();
            var main = _rain.main;
            main.startLifetime = 1.1f;
            main.startSpeed = 14f;
            main.startSize = 0.025f;
            main.startColor = new Color(0.75f, 0.82f, 0.88f, 0.55f);
            main.maxParticles = QualityTier.Rain ? 1200 : 0;
            main.simulationSpace = ParticleSystemSimulationSpace.World;
            var em = _rain.emission;
            em.rateOverTime = 0;
            var sh = _rain.shape;
            sh.shapeType = ParticleSystemShapeType.Box;
            sh.scale = new Vector3(40f, 1f, 40f);
            rainGo.transform.position = new Vector3(0, 12f, 8f);
            var vol = _rain.velocityOverLifetime;
            vol.enabled = true;
            vol.y = -12f;
            Apply("DAY", "CLEAR");
        }

        public void Apply(string timeOfDay, string weather)
        {
            _tod = timeOfDay ?? "DAY";
            _weather = weather ?? "CLEAR";
            var storm = _weather is "STORM" or "DOWNPOUR" or "THUNDERSTORM";
            var rain = storm || _weather == "RAIN";
            var night = _tod is "NIGHT" or "DUSK";
            var evening = _tod is "EVENING" or "DAWN";

            Color sunCol = new Color(1f, 0.95f, 0.82f);
            float intensity = 1.12f;
            var sunEuler = new Vector3(42f, 140f, 0);
            Color fog = new Color(0.62f, 0.74f, 0.76f);
            Color sky = new Color(0.55f, 0.72f, 0.8f);
            float fogD = QualityTier.FogDensity;

            if (evening)
            {
                sunCol = new Color(1f, 0.72f, 0.42f);
                intensity = 0.85f;
                sunEuler = new Vector3(12f, 168f, 0);
                fog = new Color(0.72f, 0.52f, 0.38f);
                sky = new Color(0.78f, 0.48f, 0.32f);
            }
            else if (night)
            {
                sunCol = new Color(0.55f, 0.62f, 0.85f);
                intensity = 0.18f;
                sunEuler = new Vector3(-8f, 200f, 0);
                fog = new Color(0.08f, 0.12f, 0.18f);
                sky = new Color(0.05f, 0.08f, 0.14f);
                fogD *= 1.4f;
            }

            if (rain)
            {
                intensity *= 0.62f;
                sunCol *= 0.85f;
                fog = Color.Lerp(fog, new Color(0.35f, 0.42f, 0.46f), 0.6f);
                fogD *= 1.7f;
                sky = Color.Lerp(sky, new Color(0.32f, 0.38f, 0.42f), 0.5f);
            }

            if (_sun)
            {
                _sun.color = sunCol;
                _sun.intensity = intensity;
                _sun.transform.rotation = Quaternion.Euler(sunEuler);
                _sun.shadows = QualityTier.SoftShadows ? LightShadows.Soft : LightShadows.None;
            }

            RenderSettings.fog = true;
            RenderSettings.fogColor = fog;
            RenderSettings.fogMode = FogMode.ExponentialSquared;
            RenderSettings.fogDensity = fogD;
            RenderSettings.ambientSkyColor = sky;
            RenderSettings.ambientEquatorColor = Color.Lerp(sky, new Color(0.35f, 0.42f, 0.32f), 0.5f);
            RenderSettings.ambientGroundColor = new Color(0.12f, 0.11f, 0.08f);
            if (Camera.main) Camera.main.backgroundColor = sky;

            if (_rain)
            {
                var em = _rain.emission;
                em.rateOverTime = !QualityTier.Rain || !rain ? 0 : storm ? 900 : 420;
            }
        }

        void Update()
        {
            var storm = _weather is "STORM" or "DOWNPOUR" or "THUNDERSTORM";
            if (storm && Random.value < 0.004f) _flash = 1f;
            if (_flash > 0f)
            {
                _flash -= Time.deltaTime * 2.4f;
                if (_sun) _sun.intensity = 1.12f + _flash * 4f;
                RenderSettings.ambientSkyColor += Color.white * _flash * 0.4f;
            }

            if ((_weather == "RAIN" || storm) && QualityTier.Rain && Random.value < 0.08f)
            {
                var p = new Vector3(Random.Range(-12f, 12f), ForestLakeBuilder.WaterY, Random.Range(4f, 22f));
                WaterRipple.Spawn(p, 0.35f);
            }
        }
    }
}
