using UnityEngine;
using UnityEngine.Rendering;

namespace RybatskiyMir.World
{
    public static class MeshUtil
    {
        static Shader _lit, _foliage, _sky, _water, _unlit;

        public static Shader LitShader => _lit ? _lit : _lit =
            Shader.Find("RybatskiyMir/StylizedLit")
            ?? Shader.Find("Universal Render Pipeline/Lit")
            ?? Shader.Find("Standard")
            ?? Shader.Find("Diffuse");

        public static Shader FoliageShader => _foliage ? _foliage : _foliage =
            Shader.Find("RybatskiyMir/Foliage") ?? LitShader;

        public static Shader SkyShader => _sky ? _sky : _sky =
            Shader.Find("RybatskiyMir/Sky")
            ?? Shader.Find("Universal Render Pipeline/Unlit")
            ?? Shader.Find("Unlit/Color");

        public static Shader WaterShader => _water ? _water : _water =
            Shader.Find("RybatskiyMir/LakeWater") ?? LitShader;

        public static Shader UnlitShader => _unlit ? _unlit : _unlit =
            Shader.Find("Universal Render Pipeline/Unlit")
            ?? Shader.Find("Unlit/Color")
            ?? Shader.Find("Sprites/Default");

        public static Mesh Grid(int n, float size, System.Func<int, int, Vector3> height, System.Func<int, int, Color> color = null)
        {
            var mesh = new Mesh { name = "grid" };
            if ((n + 1) * (n + 1) > 65000) mesh.indexFormat = IndexFormat.UInt32;
            var verts = new Vector3[(n + 1) * (n + 1)];
            var uv = new Vector2[verts.Length];
            var cols = new Color[verts.Length];
            var tris = new int[n * n * 6];
            for (int z = 0; z <= n; z++)
            for (int x = 0; x <= n; x++)
            {
                int i = z * (n + 1) + x;
                verts[i] = height(x, z);
                uv[i] = new Vector2(x / (float)n * 8f, z / (float)n * 8f);
                cols[i] = color != null ? color(x, z) : Color.white;
            }
            int t = 0;
            for (int z = 0; z < n; z++)
            for (int x = 0; x < n; x++)
            {
                int i = z * (n + 1) + x;
                tris[t++] = i;
                tris[t++] = i + n + 1;
                tris[t++] = i + 1;
                tris[t++] = i + 1;
                tris[t++] = i + n + 1;
                tris[t++] = i + n + 2;
            }
            mesh.vertices = verts;
            mesh.colors = cols;
            mesh.uv = uv;
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            mesh.RecalculateTangents();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh Cone(float radius, float height, int seg = 12)
        {
            var mesh = new Mesh { name = "cone" };
            var verts = new Vector3[seg + 2];
            var uv = new Vector2[verts.Length];
            var cols = new Color[verts.Length];
            verts[0] = new Vector3(0, height, 0);
            uv[0] = new Vector2(0.5f, 1);
            cols[0] = Color.white;
            for (int i = 0; i < seg; i++)
            {
                var a = i / (float)seg * Mathf.PI * 2f;
                verts[i + 1] = new Vector3(Mathf.Cos(a) * radius, 0, Mathf.Sin(a) * radius);
                uv[i + 1] = new Vector2(0.5f + Mathf.Cos(a) * 0.5f, 0.5f + Mathf.Sin(a) * 0.5f);
                cols[i + 1] = new Color(0.85f, 0.9f, 0.82f);
            }
            verts[seg + 1] = Vector3.zero;
            uv[seg + 1] = new Vector2(0.5f, 0.5f);
            cols[seg + 1] = new Color(0.6f, 0.65f, 0.5f);
            var tris = new int[seg * 6];
            int t = 0;
            for (int i = 0; i < seg; i++)
            {
                int n = (i + 1) % seg;
                tris[t++] = 0;
                tris[t++] = i + 1;
                tris[t++] = n + 1;
                tris[t++] = seg + 1;
                tris[t++] = n + 1;
                tris[t++] = i + 1;
            }
            mesh.vertices = verts;
            mesh.uv = uv;
            mesh.colors = cols;
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh GrassCard()
        {
            var mesh = new Mesh { name = "grassCard" };
            var verts = new Vector3[8];
            var uv = new Vector2[8];
            var nrm = new Vector3[8];
            var cols = new Color[8];
            // two crossed quads
            verts[0] = new Vector3(-0.5f, 0, 0); verts[1] = new Vector3(0.5f, 0, 0);
            verts[2] = new Vector3(0.5f, 1, 0); verts[3] = new Vector3(-0.5f, 1, 0);
            verts[4] = new Vector3(0, 0, -0.5f); verts[5] = new Vector3(0, 0, 0.5f);
            verts[6] = new Vector3(0, 1, 0.5f); verts[7] = new Vector3(0, 1, -0.5f);
            for (int i = 0; i < 4; i++) { uv[i] = new Vector2(i == 1 || i == 2 ? 1 : 0, i > 1 ? 1 : 0); nrm[i] = Vector3.forward; }
            for (int i = 4; i < 8; i++) { uv[i] = new Vector2(i == 5 || i == 6 ? 1 : 0, i > 5 ? 1 : 0); nrm[i] = Vector3.right; }
            for (int i = 0; i < 8; i++) cols[i] = Color.white;
            mesh.vertices = verts;
            mesh.uv = uv;
            mesh.normals = nrm;
            mesh.colors = cols;
            mesh.triangles = new[] { 0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6 };
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Material Lit(Color c, float smooth = 0.18f, bool transparent = false, Texture tex = null)
        {
            var m = new Material(LitShader);
            ApplyColor(m, c);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", 0.03f);
            if (m.HasProperty("_Wrap")) m.SetFloat("_Wrap", 0.32f);
            if (tex)
            {
                if (m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
                if (m.HasProperty("_MainTex")) m.SetTexture("_MainTex", tex);
            }
            if (transparent)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.SetInt("_SrcBlend", (int)BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = 3000;
            }
            return m;
        }

        public static Material Foliage(Color c, Texture tex = null, float wind = 0.35f)
        {
            var m = new Material(FoliageShader);
            ApplyColor(m, c);
            if (tex && m.HasProperty("_BaseMap")) m.SetTexture("_BaseMap", tex);
            if (m.HasProperty("_Wind")) m.SetFloat("_Wind", wind);
            if (m.HasProperty("_Cutoff")) m.SetFloat("_Cutoff", 0.28f);
            m.EnableKeyword("_ALPHATEST_ON");
            m.renderQueue = 2450;
            return m;
        }

        public static Material Unlit(Color c)
        {
            var m = new Material(UnlitShader);
            ApplyColor(m, c);
            return m;
        }

        public static Material Sky(Color horizon, Color zenith, Vector3 sunDir)
        {
            var m = new Material(SkyShader);
            if (m.HasProperty("_Horizon")) m.SetColor("_Horizon", horizon);
            if (m.HasProperty("_Zenith")) m.SetColor("_Zenith", zenith);
            if (m.HasProperty("_SunDir")) m.SetVector("_SunDir", sunDir);
            if (m.HasProperty("_SunColor")) m.SetColor("_SunColor", Palette.SunDay);
            ApplyColor(m, horizon);
            return m;
        }

        public static Material Water()
        {
            var m = new Material(WaterShader);
            if (m.HasProperty("_ShallowColor")) m.SetColor("_ShallowColor", Palette.WaterShallow);
            if (m.HasProperty("_DeepColor")) m.SetColor("_DeepColor", Palette.WaterDeep);
            if (m.HasProperty("_FoamColor")) m.SetColor("_FoamColor", Palette.Foam);
            ApplyColor(m, Palette.WaterDeep);
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", 0.9f);
            m.renderQueue = 3000;
            return m;
        }

        public static void ApplyColor(Material m, Color c)
        {
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            if (m.HasProperty("_Color")) m.SetColor("_Color", c);
            m.color = c;
        }

        public static GameObject MeshObj(string name, Mesh mesh, Material mat, Transform parent, Vector3 pos, bool collider = false)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.On;
            if (collider) go.AddComponent<MeshCollider>().sharedMesh = mesh;
            return go;
        }

        public static Transform Prim(string name, PrimitiveType type, Transform parent, Vector3 localPos, Vector3 scale, Material mat, bool collider = false)
        {
            var go = GameObject.CreatePrimitive(type);
            go.name = name;
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localRotation = Quaternion.identity;
            go.transform.localScale = scale;
            go.GetComponent<MeshRenderer>().sharedMaterial = mat;
            if (!collider) Object.Destroy(go.GetComponent<Collider>());
            return go.transform;
        }

        public static Transform MeshChild(string name, Mesh mesh, Transform parent, Vector3 localPos, Vector3 scale, Material mat)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.localPosition = localPos;
            go.transform.localScale = scale;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            var r = go.AddComponent<MeshRenderer>();
            r.sharedMaterial = mat;
            r.shadowCastingMode = ShadowCastingMode.On;
            return go.transform;
        }

        public static void SetLayerRecursively(GameObject go, int layer)
        {
            go.layer = layer;
            foreach (Transform c in go.transform) SetLayerRecursively(c.gameObject, layer);
        }
    }
}
