using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>
    /// Forest-lake surface. GPU Gerstner-ish waves, shore colour, rain sparkle.
    /// SampleHeight stays CPU so float/line can follow the same formula.
    /// </summary>
    public class LakeWater : MonoBehaviour
    {
        public static LakeWater Instance { get; private set; }

        public float Size = 52f;
        public float Amplitude = 0.042f;
        public float Speed = 0.62f;
        public float RainAmount;
        Material _mat;
        float _ripple;
        Vector3 _rippleOrigin;

        public void Build(float y)
        {
            Instance = this;
            var n = QualityTier.WaterVerts;
            var mesh = MeshUtil.Grid(n, Size, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                return new Vector3(u * Size, 0, v * Size);
            }, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * Size + ForestLakeBuilder.LakeCenter.x;
                var wz = v * Size + ForestLakeBuilder.LakeCenter.z;
                var dist = Vector2.Distance(new Vector2(wx, wz), new Vector2(ForestLakeBuilder.LakeCenter.x, ForestLakeBuilder.LakeCenter.z));
                var deep = Mathf.InverseLerp(ForestLakeBuilder.LakeRadius + 1f, 5f, dist);
                return Color.Lerp(Palette.WaterShallow, Palette.WaterDeep, deep);
            });
            _mat = MeshUtil.Water();
            _mat.SetFloat("_Amplitude", Amplitude);
            _mat.SetFloat("_Speed", Speed);
            _mat.SetVector("_LakeCenter", new Vector4(ForestLakeBuilder.LakeCenter.x, 0, ForestLakeBuilder.LakeCenter.z, ForestLakeBuilder.LakeRadius));
            var f = gameObject.AddComponent<MeshFilter>();
            f.sharedMesh = mesh;
            var r = gameObject.AddComponent<MeshRenderer>();
            r.sharedMaterial = _mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            r.receiveShadows = false;
            var col = gameObject.AddComponent<BoxCollider>();
            col.isTrigger = true;
            col.size = new Vector3(Size, 0.6f, Size);
            transform.position = new Vector3(ForestLakeBuilder.LakeCenter.x, y, ForestLakeBuilder.LakeCenter.z);
        }

        public float SampleHeight(Vector3 world)
        {
            var t = Time.time * Speed;
            var p = world;
            float w = Mathf.Sin(p.x * 0.22f + t) * 0.55f;
            w += Mathf.Cos(p.z * 0.17f + t * 1.18f) * 0.45f;
            w += Mathf.Sin((p.x + p.z) * 0.51f + t * 1.7f) * 0.22f;
            w += Mathf.Sin(p.x * 1.4f + p.z * 1.1f + t * 2.4f) * 0.08f * (0.35f + RainAmount);
            if (_ripple > 0.001f)
            {
                var d = Vector2.Distance(new Vector2(p.x, p.z), new Vector2(_rippleOrigin.x, _rippleOrigin.z));
                w += Mathf.Sin(d * 9f - t * 8f) * _ripple * 0.35f * Mathf.Clamp01(1f - d * 0.12f);
            }
            return transform.position.y + w * Amplitude;
        }

        public void Pulse(Vector3 origin)
        {
            _ripple = 1f;
            _rippleOrigin = origin;
        }

        public void Pulse() => Pulse(transform.position);

        void Update()
        {
            _ripple = Mathf.MoveTowards(_ripple, 0f, Time.deltaTime * 1.15f);
            if (!_mat) return;
            _mat.SetFloat("_Ripple", _ripple);
            _mat.SetVector("_RippleOrigin", _rippleOrigin);
            _mat.SetFloat("_Rain", RainAmount);
            _mat.SetFloat("_Amplitude", Amplitude);
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }
    }
}
