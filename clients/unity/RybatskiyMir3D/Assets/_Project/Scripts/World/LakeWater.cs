using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>
    /// Compact lake surface: two Gerstner-ish sines, shore-coloured verts, sampleable height.
    /// Not an ocean sim. HIGH later swaps this for a shader with planar reflection.
    /// </summary>
    public class LakeWater : MonoBehaviour
    {
        public static LakeWater Instance { get; private set; }

        public float Size = 64f;
        public float Amplitude = 0.055f;
        public float Speed = 0.62f;
        Mesh _mesh;
        Vector3[] _base;
        Vector3[] _work;
        Color[] _cols;
        float _ripple;

        public void Build(float y)
        {
            Instance = this;
            var n = QualityTier.WaterVerts;
            _mesh = MeshUtil.Grid(n, Size, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                return new Vector3(u * Size, 0, v * Size);
            }, (x, z) =>
            {
                var u = x / (float)n - 0.5f;
                var v = z / (float)n - 0.5f;
                var wx = u * Size;
                var wz = v * Size + 4f;
                var dist = new Vector2(wx, wz - 6f).magnitude;
                var deep = Mathf.InverseLerp(22f, 10f, dist);
                var shallow = new Color(0.31f, 0.64f, 0.66f, 0.55f);
                var deepC = new Color(0.05f, 0.23f, 0.27f, 0.88f);
                return Color.Lerp(shallow, deepC, deep);
            });
            _base = _mesh.vertices;
            _work = new Vector3[_base.Length];
            _cols = _mesh.colors;
            var mat = MeshUtil.Lit(new Color(0.12f, 0.38f, 0.44f, 0.78f), 0.88f, true);
            var f = gameObject.AddComponent<MeshFilter>();
            f.sharedMesh = _mesh;
            var r = gameObject.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
            var col = gameObject.AddComponent<BoxCollider>();
            col.isTrigger = true;
            col.size = new Vector3(Size, 0.5f, Size);
            transform.position = new Vector3(0, y, 4f);
        }

        public float SampleHeight(Vector3 world)
        {
            var local = transform.InverseTransformPoint(world);
            var t = Time.time * Speed;
            return transform.position.y
                   + (Mathf.Sin(local.x * 0.38f + t) + Mathf.Cos(local.z * 0.31f + t * 1.18f)) * Amplitude
                   + _ripple * 0.04f;
        }

        public void Pulse() => _ripple = 1f;

        void Update()
        {
            if (_base == null) return;
            _ripple = Mathf.MoveTowards(_ripple, 0f, Time.deltaTime * 1.4f);
            var t = Time.time * Speed;
            for (int i = 0; i < _base.Length; i++)
            {
                var p = _base[i];
                p.y = (Mathf.Sin(p.x * 0.38f + t) + Mathf.Cos(p.z * 0.31f + t * 1.18f)) * Amplitude;
                p.y += Mathf.Sin(p.x * 0.9f + p.z * 0.7f + t * 1.7f) * Amplitude * 0.35f;
                p.y += _ripple * 0.03f * Mathf.Sin(Time.time * 8f);
                _work[i] = p;
            }
            _mesh.vertices = _work;
            _mesh.RecalculateNormals();
        }

        void OnDestroy()
        {
            if (Instance == this) Instance = null;
        }
    }
}
