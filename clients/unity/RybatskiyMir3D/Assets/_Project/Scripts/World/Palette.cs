using UnityEngine;

namespace RybatskiyMir.World
{
    /// <summary>Art-bible colours. One language for the whole slice.</summary>
    public static class Palette
    {
        public static readonly Color SkyDay = Hex("8EC6D8");
        public static readonly Color SkyZenith = Hex("5A9FBE");
        public static readonly Color FarForest = Hex("2F4A3A");
        public static readonly Color NeedleA = Hex("3E5C3A");
        public static readonly Color NeedleB = Hex("1F3324");
        public static readonly Color Trunk = Hex("4A3B2F");
        public static readonly Color Birch = Hex("D8D0C2");
        public static readonly Color BirchMark = Hex("3A332C");
        public static readonly Color WaterShallow = new Color(0.31f, 0.64f, 0.66f, 0.62f);
        public static readonly Color WaterDeep = new Color(0.055f, 0.22f, 0.27f, 0.90f);
        public static readonly Color Foam = Hex("D7E7EA");
        public static readonly Color PierDry = Hex("6B5340");
        public static readonly Color PierWet = Hex("3E3228");
        public static readonly Color Jacket = Hex("4E5C3A");
        public static readonly Color Vest = Hex("3A462C");
        public static readonly Color Pants = Hex("3A3A30");
        public static readonly Color Boots = Hex("1F2A1C");
        public static readonly Color Cap = Hex("6A5638");
        public static readonly Color Skin = new Color(0.76f, 0.60f, 0.47f);
        public static readonly Color Shirt = Hex("6A6258");
        public static readonly Color Grass = Hex("3A5534");
        public static readonly Color GrassDark = Hex("2A3E28");
        public static readonly Color Sand = new Color(0.58f, 0.52f, 0.38f);
        public static readonly Color Dirt = new Color(0.36f, 0.28f, 0.20f);
        public static readonly Color Rock = new Color(0.42f, 0.40f, 0.36f);
        public static readonly Color Reed = new Color(0.40f, 0.46f, 0.24f);
        public static readonly Color ReedHead = new Color(0.48f, 0.36f, 0.18f);
        public static readonly Color SunDay = new Color(1f, 0.94f, 0.80f);
        public static readonly Color FogDay = new Color(0.68f, 0.78f, 0.80f);

        public static Color Hex(string h)
        {
            ColorUtility.TryParseHtmlString("#" + h.TrimStart('#'), out var c);
            return c;
        }
    }
}
