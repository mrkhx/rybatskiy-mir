using UnityEngine;

namespace RybatskiyMir.Audio
{
    /// <summary>
    /// Spatial audio hooks. Prototype clips are generated PCM so the wiring
    /// exists before authored SFX land. Replace clips, keep the Play* API.
    /// Original to the project — see docs/ASSETS.md.
    /// </summary>
    public class WorldAudio : MonoBehaviour
    {
        public static WorldAudio I { get; private set; }

        AudioSource _ambWater;
        AudioSource _ambWind;
        AudioSource _ambBirds;
        AudioSource _ambRain;
        AudioSource _sfx;
        AudioClip _splash;
        AudioClip _cast;
        AudioClip _reel;
        AudioClip _step;
        AudioClip _thunder;
        AudioClip _creak;

        public void Build(Transform waterAnchor)
        {
            I = this;
            _splash = Burst("splash", 0.22f, 0.35f);
            _cast = Tone("cast", 0.14f, 196, 0.28f);
            _reel = Click("reel", 0.07f);
            _step = Burst("step", 0.06f, 0.12f);
            _thunder = Burst("thunder", 1.45f, 0.55f);
            _creak = Tone("creak", 0.18f, 140, 0.22f);
            var waterPos = waterAnchor ? waterAnchor.position : new Vector3(0, 0.2f, 12f);
            _ambWater = Make("AmbWater", waterPos, 18f, 0.16f, Noise("water", 1.8f, true));
            _ambWind = Make("AmbWind", new Vector3(0, 6f, 0), 40f, 0.07f, Noise("wind", 2.4f, true));
            _ambBirds = Make("AmbBirds", new Vector3(8f, 8f, 6f), 32f, 0.05f, Chirp("birds", 2.6f));
            _ambRain = Make("AmbRain", new Vector3(0f, 8f, 8f), 36f, 0f, Noise("rain", 2.2f, true));
            _sfx = gameObject.AddComponent<AudioSource>();
            _sfx.spatialBlend = 1f;
            _sfx.playOnAwake = false;
        }

        public void SetAmbience(string weather, string tod, bool storm)
        {
            var night = tod is "NIGHT" or "DUSK";
            var rain = storm || weather == "RAIN";
            var foggy = weather is "FOG" or "MIST";
            if (_ambBirds) _ambBirds.volume = rain ? 0.008f : night ? 0.012f : 0.05f;
            if (_ambWind) _ambWind.volume = storm ? 0.18f : rain ? 0.12f : foggy ? 0.04f : 0.07f;
            if (_ambRain) _ambRain.volume = !rain ? 0f : storm ? 0.22f : 0.12f;
            if (_ambWater) _ambWater.volume = rain ? 0.22f : 0.16f;
        }

        public void PlaySplash(Vector3 p) => OneShot(_splash, p, 0.7f);
        public void PlayCast(Vector3 p) => OneShot(_cast, p, 0.55f);
        public void PlayReel(Vector3 p) => OneShot(_reel, p, 0.25f);
        public void PlayStep(Vector3 p) => OneShot(_step, p, 0.18f);
        public void PlayThunder(Vector3 p) => OneShot(_thunder, p, 0.85f);
        public void PlayCreak(Vector3 p) => OneShot(_creak, p, 0.28f);

        void OneShot(AudioClip clip, Vector3 p, float vol)
        {
            if (!clip || !_sfx) return;
            _sfx.transform.position = p;
            _sfx.PlayOneShot(clip, vol);
        }

        AudioSource Make(string name, Vector3 pos, float dist, float vol, AudioClip clip)
        {
            var go = new GameObject(name);
            go.transform.SetParent(transform, false);
            go.transform.position = pos;
            var a = go.AddComponent<AudioSource>();
            a.clip = clip;
            a.loop = true;
            a.spatialBlend = 1f;
            a.minDistance = 2f;
            a.maxDistance = dist;
            a.volume = vol;
            a.Play();
            return a;
        }

        static AudioClip Noise(string name, float seconds, bool loop = false)
        {
            int hz = 22050;
            int n = Mathf.CeilToInt(seconds * hz);
            var data = new float[n];
            float acc = 0;
            for (int i = 0; i < n; i++)
            {
                acc = acc * 0.92f + (Random.value * 2f - 1f) * 0.08f;
                var env = loop ? 1f : 1f - i / (float)n;
                data[i] = acc * env;
            }
            var clip = AudioClip.Create(name, n, 1, hz, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Tone(string name, float seconds, float freq, float vol)
        {
            int hz = 22050;
            int n = Mathf.CeilToInt(seconds * hz);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                var t = i / (float)hz;
                var env = Mathf.Sin(Mathf.PI * i / (float)n);
                data[i] = Mathf.Sin(t * freq * Mathf.PI * 2f) * env * vol;
            }
            var clip = AudioClip.Create(name, n, 1, hz, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Burst(string name, float seconds, float vol)
        {
            int hz = 22050;
            int n = Mathf.CeilToInt(seconds * hz);
            var data = new float[n];
            float acc = 0;
            for (int i = 0; i < n; i++)
            {
                acc = acc * 0.86f + (Random.value * 2f - 1f) * 0.14f;
                var t = i / (float)n;
                var env = t < 0.08f ? t / 0.08f : Mathf.Exp(-3.6f * (t - 0.08f));
                data[i] = acc * env * vol;
            }
            var clip = AudioClip.Create(name, n, 1, hz, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Click(string name, float seconds)
        {
            int hz = 22050;
            int n = Mathf.CeilToInt(seconds * hz);
            var data = new float[n];
            for (int i = 0; i < n; i++)
            {
                var t = i / (float)n;
                var env = Mathf.Exp(-18f * t);
                data[i] = (Random.value * 2f - 1f) * env * 0.35f
                          + Mathf.Sin(i / (float)hz * 880f * Mathf.PI * 2f) * env * 0.18f;
            }
            var clip = AudioClip.Create(name, n, 1, hz, false);
            clip.SetData(data, 0);
            return clip;
        }

        static AudioClip Chirp(string name, float seconds)
        {
            int hz = 22050;
            int n = Mathf.CeilToInt(seconds * hz);
            var data = new float[n];
            var rng = new System.Random(11);
            int chirps = 5;
            for (int c = 0; c < chirps; c++)
            {
                int start = rng.Next(0, n / 2);
                int len = hz / 12 + rng.Next(0, hz / 18);
                float f0 = 1800f + (float)rng.NextDouble() * 900f;
                float f1 = f0 + 400f + (float)rng.NextDouble() * 500f;
                for (int i = 0; i < len && start + i < n; i++)
                {
                    var t = i / (float)len;
                    var env = Mathf.Sin(Mathf.PI * t);
                    var freq = Mathf.Lerp(f0, f1, t);
                    data[start + i] += Mathf.Sin(i / (float)hz * freq * Mathf.PI * 2f) * env * 0.22f;
                }
            }
            var clip = AudioClip.Create(name, n, 1, hz, false);
            clip.SetData(data, 0);
            return clip;
        }
    }
}
