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
        public static int WaterVerts => Current == QualityLevel.Low ? 40 : Current == QualityLevel.Medium ? 72 : 110;
        public static int TreeCount => Current == QualityLevel.Low ? 22 : Current == QualityLevel.Medium ? 40 : 58;
        public static int ReedCount => Current == QualityLevel.Low ? 24 : Current == QualityLevel.Medium ? 48 : 72;
        public static bool PlanarReflection => Current == QualityLevel.High;
        public static bool Rain => Current != QualityLevel.Low;
        public static bool SoftShadows => Current != QualityLevel.Low;
        public static int ShadowCascades => Current == QualityLevel.High ? 4 : Current == QualityLevel.Medium ? 2 : 0;
        public static float FogDensity => Current == QualityLevel.Low ? 0.018f : 0.011f;
        public static float ViewDistance => Current == QualityLevel.Low ? 80 : Current == QualityLevel.Medium ? 140 : 220;
    }
}
