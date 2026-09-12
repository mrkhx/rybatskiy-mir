using UnityEngine;

namespace RybatskiyMir.Audio
{
    /// <summary>
    /// Spatial audio hooks. Prototype clips are generated noise so the wiring
    /// exists before authored SFX land. Replace clips, keep the Play* API.
    /// </summary>
    public class WorldAudio : MonoBehaviour
    {
        public static WorldAudio I { get; private set; }

        AudioSource _ambWater;
        AudioSource _ambWind;
        AudioSource _sfx;
        AudioClip _splash;
        AudioClip _cast;
        AudioClip _reel;
        AudioClip _step;

        public void Build(Transform waterAnchor)
        {
            I = this;
            _splash = Noise("splash", 0.18f);
            _cast = Tone("cast", 0.12f, 220, 0.3f);
            _reel = Noise("reel", 0.08f);
            _step = Noise("step", 0.05f);
            _ambWater = Make("AmbWater", waterAnchor ? waterAnchor.position : new Vector3(0, 0.2f, 12f), 18f, 0.18f, Noise("water", 1.6f, true));
            _ambWind = Make("AmbWind", new Vector3(0, 6f, 0), 40f, 0.08f, Noise("wind", 2.2f, true));
            _sfx = gameObject.AddComponent<AudioSource>();
            _sfx.spatialBlend = 1f;
            _sfx.playOnAwake = false;
        }

        public void PlaySplash(Vector3 p) => OneShot(_splash, p, 0.7f);
        public void PlayCast(Vector3 p) => OneShot(_cast, p, 0.55f);
        public void PlayReel(Vector3 p) => OneShot(_reel, p, 0.25f);
        public void PlayStep(Vector3 p) => OneShot(_step, p, 0.18f);

        void OneShot(AudioClip clip, Vector3 p, float vol)
        {
            if (!clip) return;
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
    }
}
