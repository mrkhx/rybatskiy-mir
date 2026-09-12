using UnityEngine;

namespace RybatskiyMir.World
{
    public class WaterRipple : MonoBehaviour
    {
        float _life = 1.1f;
        float _age;
        float _startScale;
        Material _mat;
        static Mesh _ring;

        public static void Spawn(Vector3 pos, float size)
        {
            var go = new GameObject("Ripple");
            var r = go.AddComponent<WaterRipple>();
            r.Build(pos, size);
        }

        void Build(Vector3 pos, float size)
        {
            _startScale = size;
            if (_ring == null) _ring = MakeRing();
            transform.position = new Vector3(pos.x, ForestLakeBuilder.WaterY + 0.02f, pos.z);
            transform.localScale = Vector3.one * size;
            var f = gameObject.AddComponent<MeshFilter>();
            f.sharedMesh = _ring;
            var rend = gameObject.AddComponent<MeshRenderer>();
            _mat = MeshUtil.Unlit(new Color(0.84f, 0.91f, 0.93f, 0.40f));
            if (_mat.HasProperty("_BaseColor")) _mat.SetColor("_BaseColor", new Color(0.84f, 0.91f, 0.93f, 0.40f));
            _mat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
            _mat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            _mat.SetInt("_ZWrite", 0);
            _mat.renderQueue = 3100;
            rend.sharedMaterial = _mat;
            rend.shadowCastingMode = UnityEngine.Rendering.ShadowCastingMode.Off;
        }

        void Update()
        {
            _age += Time.deltaTime;
            var t = _age / _life;
            transform.localScale = Vector3.one * (_startScale * (1f + t * 3.2f));
            var a = Mathf.Lerp(0.45f, 0f, t);
            var c = new Color(0.84f, 0.91f, 0.93f, a);
            if (_mat)
            {
                _mat.color = c;
                if (_mat.HasProperty("_BaseColor")) _mat.SetColor("_BaseColor", c);
            }
            if (t >= 1f) Destroy(gameObject);
        }

        static Mesh MakeRing()
        {
            const int seg = 28;
            var verts = new Vector3[seg * 2];
            var tris = new int[seg * 6];
            for (int i = 0; i < seg; i++)
            {
                var a = i / (float)seg * Mathf.PI * 2f;
                var dir = new Vector3(Mathf.Cos(a), 0, Mathf.Sin(a));
                verts[i] = dir * 0.85f;
                verts[i + seg] = dir;
            }
            int t = 0;
            for (int i = 0; i < seg; i++)
            {
                int n = (i + 1) % seg;
                tris[t++] = i;
                tris[t++] = i + seg;
                tris[t++] = n + seg;
                tris[t++] = i;
                tris[t++] = n + seg;
                tris[t++] = n;
            }
            var m = new Mesh { name = "ripple" };
            m.vertices = verts;
            m.triangles = tris;
            m.RecalculateNormals();
            return m;
        }
    }
}
