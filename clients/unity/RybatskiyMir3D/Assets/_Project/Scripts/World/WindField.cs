using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>
    /// One wind vector for grass, reeds, trees, rain, water. Gusts are not synced.
    /// </summary>
    [DefaultExecutionOrder(-50)]
    public class WindField : MonoBehaviour
    {
        public static WindField I { get; private set; }
        public static Vector3 Dir = new Vector3(0.55f, 0f, 0.28f);
        public static float Strength = 0.45f;
        public static float Gust;

        public float BaseStrength = 0.45f;
        public float Heading = 22f;

        public static void Tick()
        {
            var t = Time.time;
            var heading = I ? I.Heading : 22f;
            var baseS = I ? I.BaseStrength : 0.45f;
            Gust = 0.55f
                + 0.28f * Mathf.Sin(t * 0.27f)
                + 0.18f * Mathf.PerlinNoise(t * 0.11f, 2.4f);
            Strength = baseS * (0.65f + Gust * 0.7f);
            var ang = heading * Mathf.Deg2Rad + Mathf.Sin(t * 0.08f) * 0.25f;
            Dir = new Vector3(Mathf.Cos(ang), 0f, Mathf.Sin(ang));
            Shader.SetGlobalVector("_RMWindDir", new Vector4(Dir.x, Strength, Dir.z, Gust));
        }

        void Awake()
        {
            I = this;
        }

        void Update() => Tick();
    }
}
