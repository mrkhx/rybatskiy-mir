using UnityEngine;

namespace RybatskiyMir.World
{
    public static class MeshUtil
    {
        public static Mesh Grid(int n, float size, System.Func<int, int, Vector3> height, System.Func<int, int, Color> color = null)
        {
            var mesh = new Mesh { name = "grid" };
            if (n * n > 20000) mesh.indexFormat = UnityEngine.Rendering.IndexFormat.UInt32;
            var verts = new Vector3[(n + 1) * (n + 1)];
            var nrm = new Vector3[verts.Length];
            var uv = new Vector2[verts.Length];
            var cols = new Color[verts.Length];
            var tris = new int[n * n * 6];
            for (int z = 0; z <= n; z++)
            for (int x = 0; x <= n; x++)
            {
                int i = z * (n + 1) + x;
                verts[i] = height(x, z);
                uv[i] = new Vector2(x / (float)n, z / (float)n);
                nrm[i] = Vector3.up;
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
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Mesh Cone(float radius, float height, int seg = 10)
        {
            var mesh = new Mesh { name = "cone" };
            var verts = new Vector3[seg + 2];
            var nrm = new Vector3[verts.Length];
            var uv = new Vector2[verts.Length];
            verts[0] = new Vector3(0, height, 0);
            uv[0] = new Vector2(0.5f, 1);
            for (int i = 0; i < seg; i++)
            {
                var a = i / (float)seg * Mathf.PI * 2f;
                verts[i + 1] = new Vector3(Mathf.Cos(a) * radius, 0, Mathf.Sin(a) * radius);
                uv[i + 1] = new Vector2(0.5f + Mathf.Cos(a) * 0.5f, 0.5f + Mathf.Sin(a) * 0.5f);
            }
            verts[seg + 1] = Vector3.zero;
            uv[seg + 1] = new Vector2(0.5f, 0.5f);
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
            mesh.triangles = tris;
            mesh.RecalculateNormals();
            mesh.RecalculateBounds();
            return mesh;
        }

        public static Material Lit(Color c, float smooth = 0.18f, bool transparent = false)
        {
            var sh = Shader.Find("Universal Render Pipeline/Lit")
                     ?? Shader.Find("Standard")
                     ?? Shader.Find("Diffuse");
            var m = new Material(sh);
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            if (m.HasProperty("_Color")) m.SetColor("_Color", c);
            m.color = c;
            if (m.HasProperty("_Smoothness")) m.SetFloat("_Smoothness", smooth);
            if (m.HasProperty("_Metallic")) m.SetFloat("_Metallic", transparent ? 0.08f : 0.04f);
            if (transparent)
            {
                if (m.HasProperty("_Surface")) m.SetFloat("_Surface", 1f);
                m.SetOverrideTag("RenderType", "Transparent");
                m.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.SrcAlpha);
                m.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
                m.SetInt("_ZWrite", 0);
                m.DisableKeyword("_ALPHATEST_ON");
                m.EnableKeyword("_ALPHABLEND_ON");
                m.EnableKeyword("_SURFACE_TYPE_TRANSPARENT");
                m.renderQueue = 3000;
            }
            return m;
        }

        public static Material Unlit(Color c)
        {
            var sh = Shader.Find("Universal Render Pipeline/Unlit")
                     ?? Shader.Find("Unlit/Color")
                     ?? Shader.Find("Sprites/Default");
            var m = new Material(sh) { color = c };
            if (m.HasProperty("_BaseColor")) m.SetColor("_BaseColor", c);
            return m;
        }

        public static GameObject MeshObj(string name, Mesh mesh, Material mat, Transform parent, Vector3 pos, bool collider = false)
        {
            var go = new GameObject(name);
            go.transform.SetParent(parent, false);
            go.transform.position = pos;
            go.AddComponent<MeshFilter>().sharedMesh = mesh;
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
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
            go.AddComponent<MeshRenderer>().sharedMaterial = mat;
            return go.transform;
        }
    }
}
