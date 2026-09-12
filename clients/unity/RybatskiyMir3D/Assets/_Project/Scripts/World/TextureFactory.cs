using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>Runtime tiling textures. No magenta import, no photoreal clash.</summary>
    public static class TextureFactory
    {
        static Texture2D _wood, _bark, _grass, _ground, _blade, _noise, _cloth;

        public static Texture2D Wood => _wood != null ? _wood : _wood = MakeWood();
        public static Texture2D Bark => _bark != null ? _bark : _bark = MakeBark();
        public static Texture2D Grass => _grass != null ? _grass : _grass = MakeGrass();
        public static Texture2D Ground => _ground != null ? _ground : _ground = MakeGround();
        public static Texture2D Blade => _blade != null ? _blade : _blade = MakeBlade();
        public static Texture2D Noise => _noise != null ? _noise : _noise = MakeNoise();
        public static Texture2D Cloth => _cloth != null ? _cloth : _cloth = MakeCloth();

        static float Hash(int x, int y)
        {
            int n = x * 374761393 + y * 668265263;
            n = (n ^ (n >> 13)) * 1274126177;
            return (n & 0x7fffffff) / 2147483647f;
        }

        static float VNoise(float x, float y)
        {
            int x0 = Mathf.FloorToInt(x);
            int y0 = Mathf.FloorToInt(y);
            float fx = x - x0;
            float fy = y - y0;
            fx = fx * fx * (3f - 2f * fx);
            fy = fy * fy * (3f - 2f * fy);
            float a = Hash(x0, y0);
            float b = Hash(x0 + 1, y0);
            float c = Hash(x0, y0 + 1);
            float d = Hash(x0 + 1, y0 + 1);
            return Mathf.Lerp(Mathf.Lerp(a, b, fx), Mathf.Lerp(c, d, fx), fy);
        }

        static float Fbm(float x, float y, int oct = 4)
        {
            float v = 0, a = 0.5f, f = 1;
            for (int i = 0; i < oct; i++)
            {
                v += VNoise(x * f, y * f) * a;
                a *= 0.5f;
                f *= 2.03f;
            }
            return v;
        }

        static Texture2D Make(int size, System.Func<int, int, Color> px)
        {
            var t = new Texture2D(size, size, TextureFormat.RGBA32, true);
            t.wrapMode = TextureWrapMode.Repeat;
            t.filterMode = FilterMode.Bilinear;
            var cols = new Color[size * size];
            for (int y = 0; y < size; y++)
            for (int x = 0; x < size; x++)
                cols[y * size + x] = px(x, y);
            t.SetPixels(cols);
            t.Apply(true, true);
            t.name = "RM_Runtime";
            return t;
        }

        static Texture2D MakeWood()
        {
            return Make(256, (x, y) =>
            {
                float u = x / 256f;
                float v = y / 256f;
                float ring = Mathf.Abs(Mathf.Sin((u + Fbm(u * 3f, v * 0.4f, 3) * 0.25f) * 28f));
                float grain = Fbm(u * 2f, v * 18f, 3);
                var a = new Color(0.46f, 0.34f, 0.22f);
                var b = new Color(0.28f, 0.19f, 0.12f);
                return Color.Lerp(a, b, ring * 0.55f + grain * 0.3f);
            });
        }

        static Texture2D MakeBark()
        {
            return Make(256, (x, y) =>
            {
                float u = x / 256f;
                float v = y / 256f;
                float crack = Mathf.Abs(Mathf.Sin(u * 40f + Fbm(u * 6f, v * 2f) * 4f));
                float n = Fbm(u * 8f, v * 4f, 4);
                var a = new Color(0.32f, 0.24f, 0.17f);
                var b = new Color(0.16f, 0.12f, 0.09f);
                return Color.Lerp(a, b, n * 0.6f + (1f - crack) * 0.35f);
            });
        }

        static Texture2D MakeGrass()
        {
            return Make(128, (x, y) =>
            {
                float n = Fbm(x / 18f, y / 18f, 4);
                var a = new Color(0.28f, 0.40f, 0.20f);
                var b = new Color(0.16f, 0.26f, 0.14f);
                return Color.Lerp(a, b, n);
            });
        }

        static Texture2D MakeGround()
        {
            return Make(256, (x, y) =>
            {
                float n = Fbm(x / 40f, y / 40f, 5);
                float peb = VNoise(x / 7f, y / 7f);
                var a = new Color(0.34f, 0.38f, 0.24f);
                var b = new Color(0.22f, 0.28f, 0.16f);
                var c = Color.Lerp(a, b, n);
                if (peb > 0.82f) c = Color.Lerp(c, new Color(0.40f, 0.36f, 0.28f), 0.4f);
                return c;
            });
        }

        static Texture2D MakeBlade()
        {
            return Make(64, (x, y) =>
            {
                float u = (x + 0.5f) / 64f * 2f - 1f;
                float v = (y + 0.5f) / 64f;
                float width = 0.18f * (1f - v * 0.85f);
                float d = Mathf.Abs(u);
                float a = Mathf.InverseLerp(width, width * 0.4f, d);
                a *= Mathf.SmoothStep(0f, 0.08f, v) * Mathf.SmoothStep(1.02f, 0.88f, v);
                var col = Color.Lerp(new Color(0.18f, 0.32f, 0.14f), new Color(0.38f, 0.52f, 0.22f), v);
                col.a = a;
                return col;
            });
        }

        static Texture2D MakeNoise()
        {
            return Make(128, (x, y) =>
            {
                float n = Fbm(x / 16f, y / 16f, 4);
                return new Color(n, n, n, 1f);
            });
        }

        static Texture2D MakeCloth()
        {
            return Make(128, (x, y) =>
            {
                float weave = 0.92f + 0.08f * Mathf.Sin(x * 0.9f) * Mathf.Sin(y * 0.9f);
                float n = Fbm(x / 22f, y / 22f, 3);
                return new Color(weave * (0.85f + n * 0.15f), weave, weave * 0.95f, 1f);
            });
        }
    }
}
