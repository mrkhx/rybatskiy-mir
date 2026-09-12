namespace RybatskiyMir.World
{
    public enum QualityLevel { Low, Medium, High }

    public static class QualityTier
    {
        public static QualityLevel Current =
#if UNITY_ANDROID || UNITY_IOS
            QualityLevel.Medium;
#else
            QualityLevel.High;
#endif

        public static float TreeDistance => Current == QualityLevel.Low ? 70 : Current == QualityLevel.Medium ? 130 : 210;
        public static int WaterVerts => Current == QualityLevel.Low ? 36 : Current == QualityLevel.Medium ? 56 : 80;
        public static int TreeCount => Current == QualityLevel.Low ? 28 : Current == QualityLevel.Medium ? 52 : 78;
        public static int DistantTreeCount => Current == QualityLevel.Low ? 18 : Current == QualityLevel.Medium ? 36 : 52;
        public static int ReedCount => Current == QualityLevel.Low ? 28 : Current == QualityLevel.Medium ? 56 : 88;
        public static int GrassCount => Current == QualityLevel.Low ? 40 : Current == QualityLevel.Medium ? 110 : 180;
        public static int BushCount => Current == QualityLevel.Low ? 8 : Current == QualityLevel.Medium ? 16 : 24;
        public static bool PlanarReflection => Current == QualityLevel.High;
        public static bool Rain => Current != QualityLevel.Low;
        public static bool SoftShadows => Current != QualityLevel.Low;
        public static int ShadowCascades => Current == QualityLevel.High ? 4 : Current == QualityLevel.Medium ? 2 : 0;
        public static float FogStart => Current == QualityLevel.Low ? 18f : 28f;
        public static float FogEnd => Current == QualityLevel.Low ? 70f : Current == QualityLevel.Medium ? 110f : 150f;
        public static float FogDensity => Current == QualityLevel.Low ? 0.016f : 0.0085f;
        public static float ViewDistance => Current == QualityLevel.Low ? 90 : Current == QualityLevel.Medium ? 150 : 230;
    }
}
